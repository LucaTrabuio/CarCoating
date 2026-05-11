/**
 * One-off audit: print every name that lands in the storefront <Header>
 * next to the logo, so we can spot ones long enough to push the desktop
 * nav onto a second line. Two sources feed Header.storeName:
 *   - subCompany.name      (used for multi-store sub-company pages)
 *   - store.store_name     (used for single-store pages)
 *
 * Both are listed below, sorted longest-first.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
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

  const subs = await db.collection('sub_companies').get();
  const subRows = subs.docs.map(d => {
    const data = d.data() as Record<string, unknown>;
    return { id: d.id, name: (data.name as string) || '' };
  }).filter(r => r.name);

  const stores = await db.collection('stores').get();
  const storeRows = stores.docs.map(d => {
    const data = d.data() as Record<string, unknown>;
    return { id: d.id, name: (data.store_name as string) || '' };
  }).filter(r => r.name);

  console.log(`=== sub_companies (${subRows.length}) — fed as Header.storeName on multi-store pages ===`);
  subRows.sort((a, b) => b.name.length - a.name.length);
  for (const r of subRows) {
    const flag = r.name.length >= 12 ? '⚠ ' : '  ';
    console.log(`${flag}${String(r.name.length).padStart(2)} chars  ${r.name.padEnd(30)} [${r.id}]`);
  }

  console.log(`\n=== stores (${storeRows.length}) — fed as Header.storeName on single-store pages ===`);
  storeRows.sort((a, b) => b.name.length - a.name.length);
  // Only show the top 20 — most are short SS names.
  for (const r of storeRows.slice(0, 20)) {
    const flag = r.name.length >= 16 ? '⚠ ' : '  ';
    console.log(`${flag}${String(r.name.length).padStart(2)} chars  ${r.name.padEnd(35)} [${r.id}]`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
