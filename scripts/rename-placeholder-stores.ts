/**
 * Rename the 50 stores whose doc-id / store_id / store_slug still
 * carries the placeholder pattern (`<prefecture>-area-<n>` or
 * `<prefecture>-area-<n>-<m>`) introduced by the bulk import script.
 *
 * After scripts/rename-placeholder-subcompanies.ts ran, each placeholder
 * store now references a properly-named sub_company (e.g. `tachikawa-
 * fuchu`, `fujisawa`, `kobe-nishi`), but its own id and URL slug still
 * say `tokyo-area-1-2`. URL convention in this project is
 * `<sub_company_slug>` for the first store in the area and
 * `<sub_company_slug>-<n>` for subsequent ones — we follow that here.
 *
 * Per-store rename mechanic (Firestore doc ids are immutable):
 *   1. Compute target id by stripping the old placeholder prefix and
 *      reapplying the new sub_company id at the start. The numeric tail
 *      (if any) is preserved.
 *   2. If the target id collides with an existing doc, append `-<k>`
 *      (k=2,3,…) until free.
 *   3. Copy doc to new id with store_id + store_slug fields updated.
 *   4. Update the sub_company.stores array (arrayRemove old + arrayUnion
 *      new).
 *   5. Delete the old doc.
 *
 * Idempotent: stores that already have a non-placeholder id are skipped.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/rename-placeholder-stores.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Old placeholder sub-company id → new sub-company id. Mirrors
// rename-placeholder-subcompanies.ts. Used to map a store id like
// `tokyo-area-1-2` → `tachikawa-fuchu-2`.
const SC_RENAMES: Record<string, string> = {
  'aomori-area-1': 'aomori',
  'chiba-area-1': 'sakura-yachiyo',
  'ehime-area-1': 'matsuyama',
  'fukuoka-area-1': 'fukuoka-minami',
  'fukuoka-area-2': 'fukuoka-shime',
  'fukushima-area-1': 'iwaki',
  'gifu-area-1': 'gifu',
  'hyogo-area-1': 'hyogo',
  'hyogo-area-2': 'kobe-nishi',
  'kanagawa-area-1': 'sagamihara',
  'kanagawa-area-2': 'yokohama-asahi',
  'kanagawa-area-3': 'fujisawa',
  'kanagawa-area-4': 'yokohama-aoba',
  'kyoto-area-1': 'nagaokakyo',
  'kyoto-area-2': 'kyoto-chushin',
  'kyoto-area-3': 'kyoto-kita',
  'miyagi-area-1': 'osaki-misato',
  'miyagi-area-2': 'higashimatsushima',
  'nara-area-1': 'kashihara',
  'nara-area-2': 'kawai',
  'nara-area-3': 'nara',
  'oita-area-1': 'hita',
  'okayama-area-1': 'soja',
  'osaka-area-1': 'osaka-kita',
  'osaka-area-2': 'higashiosaka',
  'osaka-area-3': 'osaka-minami',
  'osaka-area-4': 'sakai-kishiwada',
  'tokyo-area-1': 'tachikawa-fuchu',
  'tokyo-area-2': 'tokyo',
  'tokyo-area-3': 'koto-sumida',
  'tokyo-area-4': 'adachi-katsushika',
  'tokyo-area-5': 'suginami-nakano',
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('[dry-run mode] no writes will be made\n');

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();

  const snap = await db.collection('stores').get();
  const allIds = new Set(snap.docs.map(d => d.id));
  // Also avoid colliding with sub_company ids — those route to the
  // sub_company page first via /{slug}, so a store sharing the slug
  // gets shadowed unless the sub_company has only that one store.
  const subCoSnap = await db.collection('sub_companies').get();
  const subCoIds = new Set(subCoSnap.docs.map(d => d.id));
  // Count how many stores currently belong to each sub_company.
  const scStoreCount = new Map<string, number>();
  for (const d of snap.docs) {
    const sc = String(d.data().sub_company_id ?? '');
    if (sc) scStoreCount.set(sc, (scStoreCount.get(sc) ?? 0) + 1);
  }

  // Sort placeholder prefixes longest-first so `tokyo-area-1` beats `tokyo-area`.
  const oldPrefixes = Object.keys(SC_RENAMES).sort((a, b) => b.length - a.length);

  interface Plan { oldId: string; newId: string; subCompanyId: string; data: FirebaseFirestore.DocumentData; }
  const plans: Plan[] = [];

  // First pass: compute target ids using the store's ACTUAL current
  // sub_company_id (which may differ from the placeholder-derived
  // mapping if the store was relocated to a different sub_company).
  const targetIds = new Set<string>();
  for (const doc of snap.docs) {
    let matched: string | null = null;
    for (const p of oldPrefixes) {
      if (doc.id === p || doc.id.startsWith(p + '-')) {
        matched = p;
        break;
      }
    }
    if (!matched) continue;

    const currentSc = String(doc.data().sub_company_id ?? '');
    const baseSlug = currentSc || SC_RENAMES[matched];

    // Convention from existing data:
    //   - 1 store under a sub_company → store uses the bare sub_company
    //     slug (eniwa, fussa, …).
    //   - >1 stores under a sub_company → each store uses `<sc>-<n>`
    //     starting from -1, leaving the bare slug for the sub_company
    //     URL itself.
    const taken = (id: string) => allIds.has(id) || targetIds.has(id);
    const multiStore = (scStoreCount.get(currentSc) ?? 0) > 1;

    let candidate: string;
    if (multiStore) {
      let k = 1;
      while (taken(`${baseSlug}-${k}`)) k++;
      candidate = `${baseSlug}-${k}`;
    } else {
      candidate = baseSlug;
      if (taken(candidate)) {
        let k = 1;
        while (taken(`${baseSlug}-${k}`)) k++;
        candidate = `${baseSlug}-${k}`;
      }
    }
    targetIds.add(candidate);
    plans.push({
      oldId: doc.id,
      newId: candidate,
      subCompanyId: currentSc || baseSlug,
      data: doc.data(),
    });
  }

  console.log(`=== STORE ID RENAMES (${plans.length}) ===`);
  for (const p of plans) {
    console.log(`  ${p.oldId.padEnd(28)} → ${p.newId.padEnd(28)} | sc=${p.subCompanyId} | "${p.data.store_name}"`);
  }

  if (dryRun) {
    console.log(`\nSummary: ${plans.length} renames [dry-run]`);
  } else {
    console.log('\nApplying…');
    for (const p of plans) {
      const newDoc = { ...p.data, store_id: p.newId, store_slug: p.newId };
      await db.collection('stores').doc(p.newId).set(newDoc);
      await db.collection('stores').doc(p.oldId).delete();
      // Reconcile the sub_company.stores array.
      if (p.subCompanyId) {
        await db.collection('sub_companies').doc(p.subCompanyId).update({
          stores: FieldValue.arrayRemove(p.oldId),
        });
        await db.collection('sub_companies').doc(p.subCompanyId).update({
          stores: FieldValue.arrayUnion(p.newId),
        });
      }
    }
    const after = await db.collection('stores').get();
    const remaining = after.docs.filter(d => /-area-\d+(-\d+)?$/.test(d.id)).length;
    console.log(`After: ${after.size} stores, ${remaining} placeholder ids remaining`);
  }

  // Append summary to MISSING_DATA.md
  const md = [
    '',
    '---',
    '',
    `## Store id rename — ${dryRun ? 'dry-run preview' : new Date().toISOString()}`,
    '',
    '| Old id | New id | sub_company_id | store_name |',
    '|---|---|---|---|',
    ...plans.map(p =>
      `| \`${p.oldId}\` | \`${p.newId}\` | \`${p.subCompanyId}\` | ${p.data.store_name} |`,
    ),
    '',
  ].join('\n');
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  if (existsSync(mdPath)) appendFileSync(mdPath, md, 'utf-8');
}

main().catch(err => { console.error(err); process.exit(1); });
