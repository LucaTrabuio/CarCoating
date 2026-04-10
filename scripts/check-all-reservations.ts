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

  // Full collection, no filter (mirrors the super_admin branch of the API)
  const snap = await db.collection('reservations').get();
  console.log(`TOTAL reservations in collection: ${snap.size}\n`);

  const byStatus = new Map<string, number>();
  const byStore = new Map<string, number>();
  const missingFields: string[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    byStatus.set(d.status || '(none)', (byStatus.get(d.status || '(none)') || 0) + 1);
    byStore.set(d.storeId || '(none)', (byStore.get(d.storeId || '(none)') || 0) + 1);

    const problems: string[] = [];
    if (!d.storeId) problems.push('no storeId');
    if (!d.status) problems.push('no status');
    if (!d.date) problems.push('no date');
    if (problems.length) {
      missingFields.push(`${doc.id}: ${problems.join(', ')}`);
    }
  }

  console.log('By status:');
  for (const [k, v] of byStatus) console.log(`  ${k}: ${v}`);
  console.log('\nBy storeId:');
  for (const [k, v] of byStore) console.log(`  ${k}: ${v}`);

  if (missingFields.length) {
    console.log(`\n${missingFields.length} reservations with missing fields:`);
    missingFields.slice(0, 20).forEach(m => console.log(`  ${m}`));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
