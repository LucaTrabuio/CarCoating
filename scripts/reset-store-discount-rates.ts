/**
 * One-off ops script: clear per-store discount_rate fields.
 *
 * BACKGROUND
 * The storefront layout merges the HQ campaign with each store's own
 * discount_rate via nullish-coalescing:
 *
 *   discount_rate: store.discount_rate ?? defaults.discount
 *
 * Every store doc in Firestore today has a non-zero `discount_rate`
 * (mostly 20) baked in from earlier seed/import passes. That means
 * lowering the HQ default to 0 has no effect — the per-store value
 * wins for every site. The user already worked around this by setting
 * `force_hq_campaign: true`, which short-circuits the merge to use HQ
 * values only. But the stale per-store data is still a footgun: the
 * moment force_hq_campaign is unchecked, every store's 20% snaps back.
 *
 * This script writes `discount_rate: 0` to every store doc so the
 * historical drift is gone for good. After this runs, per-store
 * discount overrides only exist for stores that explicitly opt in
 * later (by editing them through the admin).
 *
 * USAGE
 *   # Dry-run: list which docs would change, no writes
 *   npx tsx --env-file=.env.local scripts/reset-store-discount-rates.ts
 *
 *   # Real run
 *   npx tsx --env-file=.env.local scripts/reset-store-discount-rates.ts --apply
 *
 * SAFETY
 *   - Idempotent: stores that are already at 0 (or missing the field)
 *     are skipped.
 *   - Writes use { merge: true } and only touch `discount_rate` —
 *     every other field on the doc is untouched.
 *   - Batched in groups of 400 to stay under Firestore's 500-per-batch
 *     limit (the cap is well above the ~200-store dataset, but kept
 *     defensive for future growth).
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!getApps().length) {
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

  const toReset: Array<{ docId: string; storeId: string; storeName: string; current: number }> = [];
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    const cur = data.discount_rate;
    const curNum = typeof cur === 'number' ? cur : typeof cur === 'string' ? Number(cur) : NaN;
    if (Number.isFinite(curNum) && curNum !== 0) {
      toReset.push({
        docId: d.id,
        storeId: (data.store_id as string) || d.id,
        storeName: (data.store_name as string) || '(no name)',
        current: curNum,
      });
    }
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Stores to reset: ${toReset.length} of ${snap.size}`);
  console.log('─'.repeat(80));
  for (const r of toReset.slice(0, 30)) {
    console.log(`  ${r.storeId.padEnd(28)} ${String(r.current).padStart(3)}%  ${r.storeName}`);
  }
  if (toReset.length > 30) console.log(`  …and ${toReset.length - 30} more`);
  console.log('─'.repeat(80));

  if (!APPLY) {
    console.log('\n[DRY-RUN] no writes. Re-run with --apply to commit.');
    return;
  }
  if (toReset.length === 0) {
    console.log('Nothing to do — every store is already at 0.');
    return;
  }

  const BATCH = 400;
  for (let i = 0; i < toReset.length; i += BATCH) {
    const slice = toReset.slice(i, i + BATCH);
    const batch = db.batch();
    for (const r of slice) {
      batch.set(db.collection('stores').doc(r.docId), { discount_rate: 0 }, { merge: true });
    }
    await batch.commit();
    console.log(`  ✓ committed ${slice.length} (cumulative ${Math.min(i + BATCH, toReset.length)} / ${toReset.length})`);
  }
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
