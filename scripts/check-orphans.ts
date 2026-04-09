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

  const snap = await db.collection('stores').get();
  const orphans: { id: string; name: string; prefecture: string; city: string }[] = [];
  const byGroup = new Map<string, number>();

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.sub_company_id) {
      orphans.push({
        id: doc.id,
        name: d.store_name,
        prefecture: d.prefecture || '',
        city: d.city || '',
      });
    } else {
      byGroup.set(d.sub_company_id, (byGroup.get(d.sub_company_id) || 0) + 1);
    }
  }

  console.log(`Total stores: ${snap.size}`);
  console.log(`Orphans (no sub_company_id): ${orphans.length}\n`);
  for (const o of orphans) {
    console.log(`  ${o.id}: ${o.name} (${o.prefecture} ${o.city})`);
  }

  console.log(`\nSub-companies: ${byGroup.size}`);
}

main().catch(console.error);
