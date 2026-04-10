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

  const snap = await db.collection('reservations').orderBy('createdAt', 'desc').limit(10).get();
  console.log(`Total recent reservations: ${snap.size}\n`);

  if (snap.empty) {
    console.log('NO RESERVATIONS FOUND IN FIRESTORE');
    return;
  }

  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  storeId: ${d.storeId}`);
    console.log(`  status: ${d.status}`);
    console.log(`  date/time: ${d.date} ${d.time}`);
    console.log(`  name: ${d.name}`);
    console.log(`  email: ${d.email}`);
    console.log(`  createdAt: ${d.createdAt}`);
    console.log(`  calendar event: ${d.googleCalendarEventId || '(none)'}`);
    console.log('');
  }
}

main().catch(console.error);
