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
  console.log(`Total stores in Firestore: ${snap.size}\n`);

  const rows = snap.docs
    .map(d => ({
      id: d.id,
      name: d.data().store_name || '',
      tel: d.data().tel || '',
      address: d.data().address || '',
      is_active: d.data().is_active,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const r of rows) {
    const issues: string[] = [];
    if (!r.tel) issues.push('no-tel');
    if (!r.address) issues.push('no-addr');
    const flags = issues.length ? ` [${issues.join(',')}]` : '';
    console.log(`${r.id.padEnd(35)} ${r.name}${flags}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
