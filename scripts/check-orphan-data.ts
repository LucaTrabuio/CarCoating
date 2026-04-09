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

  const storeIds = ['osaka-umeda', 'tokyo-shibuya', 'tokyo-shinjuku'];
  const scSlugs = ['umeda', 'shibuya', 'shinjuku'];

  console.log('=== STORES ===');
  for (const id of storeIds) {
    const doc = await db.collection('stores').doc(id).get();
    if (!doc.exists) { console.log(`${id}: MISSING`); continue; }
    const d = doc.data()!;
    console.log(`${id}:`);
    console.log(`  store_name: ${d.store_name}`);
    console.log(`  is_active: ${d.is_active}`);
    console.log(`  sub_company_id: ${d.sub_company_id}`);
    console.log(`  tel: ${d.tel || '(empty)'}`);
    console.log(`  address: ${d.address || '(empty)'}`);
    console.log(`  page_layout length: ${(d.page_layout || '').length}`);
  }

  console.log('\n=== SUB-COMPANIES ===');
  for (const slug of scSlugs) {
    const snap = await db.collection('sub_companies').where('slug', '==', slug).get();
    if (snap.empty) { console.log(`slug=${slug}: MISSING`); continue; }
    const doc = snap.docs[0];
    const d = doc.data();
    console.log(`slug=${slug} (id=${doc.id}):`);
    console.log(`  name: ${d.name}`);
    console.log(`  stores: ${JSON.stringify(d.stores)}`);

    // Query stores by sub_company_id
    const storesSnap = await db.collection('stores').where('sub_company_id', '==', doc.id).get();
    console.log(`  stores with matching sub_company_id: ${storesSnap.size}`);
    for (const sd of storesSnap.docs) {
      console.log(`    - ${sd.id} (${sd.data().store_name})`);
    }
  }
}

main().catch(console.error);
