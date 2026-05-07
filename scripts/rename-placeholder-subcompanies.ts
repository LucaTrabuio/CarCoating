/**
 * Rename the 32 placeholder sub_company docs (id pattern
 * `<prefecture>-area-<n>`) to proper romaji slugs derived from the
 * area name. Plus delete 2 empty placeholders (hiroshima-area-1,
 * kumamoto-area-1) that have no stores attached.
 *
 * Firestore doc IDs can't be renamed in place, so for each rename:
 *   1. Read old doc data
 *   2. Write a new doc at the new id with id/slug updated and the
 *      same name/description/url/stores arrays
 *   3. Update every store with sub_company_id === old → new
 *   4. Delete the old sub_company doc
 *
 * Idempotent: skips if the new id already exists OR the old id is
 * absent (re-runs are safe).
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/rename-placeholder-subcompanies.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Old placeholder id → new romaji slug. Names below match the area
// names already on each sub_company doc; the slug is a concise romaji
// derived from the area's primary location tokens.
const RENAMES: { from: string; to: string }[] = [
  { from: 'aomori-area-1', to: 'aomori' },
  { from: 'chiba-area-1', to: 'sakura-yachiyo' },
  { from: 'ehime-area-1', to: 'matsuyama' },
  { from: 'fukuoka-area-1', to: 'fukuoka-minami' },
  { from: 'fukuoka-area-2', to: 'fukuoka-shime' },
  { from: 'fukushima-area-1', to: 'iwaki' },
  { from: 'gifu-area-1', to: 'gifu' },
  { from: 'hyogo-area-1', to: 'hyogo' },
  { from: 'hyogo-area-2', to: 'kobe-nishi' },
  { from: 'kanagawa-area-1', to: 'sagamihara' },
  { from: 'kanagawa-area-2', to: 'yokohama-asahi' },
  { from: 'kanagawa-area-3', to: 'fujisawa' },
  { from: 'kanagawa-area-4', to: 'yokohama-aoba' },
  { from: 'kyoto-area-1', to: 'nagaokakyo' },
  { from: 'kyoto-area-2', to: 'kyoto-chushin' },
  { from: 'kyoto-area-3', to: 'kyoto-kita' },
  { from: 'miyagi-area-1', to: 'osaki-misato' },
  { from: 'miyagi-area-2', to: 'higashimatsushima' },
  { from: 'nara-area-1', to: 'kashihara' },
  { from: 'nara-area-2', to: 'kawai' },
  { from: 'nara-area-3', to: 'nara' },
  { from: 'oita-area-1', to: 'hita' },
  { from: 'okayama-area-1', to: 'soja' },
  { from: 'osaka-area-1', to: 'osaka-kita' },
  { from: 'osaka-area-2', to: 'higashiosaka' },
  { from: 'osaka-area-3', to: 'osaka-minami' },
  { from: 'osaka-area-4', to: 'sakai-kishiwada' },
  { from: 'tokyo-area-1', to: 'tachikawa-fuchu' },
  { from: 'tokyo-area-2', to: 'tokyo' },
  { from: 'tokyo-area-3', to: 'koto-sumida' },
  { from: 'tokyo-area-4', to: 'adachi-katsushika' },
  { from: 'tokyo-area-5', to: 'suginami-nakano' },
];

// Empty placeholders to just delete.
const DELETES = ['hiroshima-area-1', 'kumamoto-area-1'];

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

  // Load all sub_companies + stores upfront.
  const scSnap = await db.collection('sub_companies').get();
  const scById = new Map(scSnap.docs.map(d => [d.id, d.data()] as const));
  const storeSnap = await db.collection('stores').get();
  const storesBySc = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const d of storeSnap.docs) {
    const sc = String(d.data().sub_company_id ?? '');
    if (!sc) continue;
    if (!storesBySc.has(sc)) storesBySc.set(sc, []);
    storesBySc.get(sc)!.push(d);
  }

  // Collision check
  for (const r of RENAMES) {
    if (scById.has(r.to) && r.from !== r.to) {
      console.error(`COLLISION: rename target "${r.to}" already exists. Aborting (already-renamed sub_companies are also fine — re-run is safe).`);
      // Fall through and let the per-rename idempotent guard handle it.
    }
  }

  console.log(`=== RENAMES (${RENAMES.length}) ===`);
  let renamed = 0;
  for (const r of RENAMES) {
    const oldDoc = scById.get(r.from);
    if (!oldDoc) {
      console.log(`  SKIP ${r.from} → ${r.to} — old doc absent (already renamed?)`);
      continue;
    }
    if (scById.has(r.to)) {
      console.log(`  SKIP ${r.from} → ${r.to} — target already exists`);
      continue;
    }
    const stores = storesBySc.get(r.from) ?? [];
    console.log(`  ${r.from} → ${r.to} | ${stores.length} stores | name="${oldDoc.name}"`);

    if (!dryRun) {
      const newData = { ...oldDoc, id: r.to, slug: r.to };
      await db.collection('sub_companies').doc(r.to).set(newData);
      const batch = db.batch();
      for (const s of stores) batch.update(s.ref, { sub_company_id: r.to });
      if (stores.length > 0) await batch.commit();
      await db.collection('sub_companies').doc(r.from).delete();
    }
    renamed++;
  }

  console.log(`\n=== DELETES — empty placeholders (${DELETES.length}) ===`);
  let deleted = 0;
  for (const id of DELETES) {
    const doc = scById.get(id);
    if (!doc) {
      console.log(`  SKIP ${id} — already absent`);
      continue;
    }
    const n = (storesBySc.get(id) ?? []).length;
    if (n > 0) {
      console.log(`  SKIP ${id} — has ${n} stores, not safe to delete`);
      continue;
    }
    console.log(`  DELETE ${id} — name="${doc.name}", 0 stores`);
    if (!dryRun) await db.collection('sub_companies').doc(id).delete();
    deleted++;
  }

  console.log(`\nSummary: ${renamed} renamed, ${deleted} deleted${dryRun ? ' [dry-run]' : ''}`);

  // Verify after apply
  if (!dryRun) {
    const after = await db.collection('sub_companies').get();
    const placeholders = after.docs.filter(d => /^[a-z]+-area-\d+$/.test(d.id));
    console.log(`After: ${after.size} sub_companies, ${placeholders.length} placeholders remaining`);
  }

  // Append to MISSING_DATA.md
  const md = [
    '',
    '---',
    '',
    `## Sub_company slug rename — ${dryRun ? 'dry-run preview' : new Date().toISOString()}`,
    '',
    '| From | To | Area name |',
    '|---|---|---|',
    ...RENAMES.map(r => `| \`${r.from}\` | \`${r.to}\` | ${(scById.get(r.from) as { name?: string } | undefined)?.name ?? '_(missing)_'} |`),
    '',
    `### Deleted empty placeholders`,
    '',
    ...DELETES.map(id => `- \`${id}\` (name: ${(scById.get(id) as { name?: string } | undefined)?.name ?? '_(missing)_'})`),
    '',
  ].join('\n');
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  if (existsSync(mdPath)) appendFileSync(mdPath, md, 'utf-8');
}

main().catch(err => { console.error(err); process.exit(1); });
