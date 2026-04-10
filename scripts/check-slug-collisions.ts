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

  const storeIds = new Set((await db.collection('stores').get()).docs.map(d => d.id));
  const subs = (await db.collection('sub_companies').get()).docs;

  console.log('Sub-companies whose slug collides with a store_id:\n');
  let count = 0;
  for (const sub of subs) {
    const slug = sub.data().slug || sub.id;
    if (storeIds.has(slug)) {
      const stores = sub.data().stores || [];
      console.log(`  ${slug}: sub_company "${sub.data().name}" (${stores.length} stores) collides with store "${slug}"`);
      count++;
    }
  }
  console.log(`\nTotal collisions: ${count}`);
}

main().catch(err => { console.error(err); process.exit(1); });
