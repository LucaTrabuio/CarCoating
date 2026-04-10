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

  // tokyo-shinjuku (新宿高島屋前店) is real — confirmed from minato-shibuya-coating.com
  // Real tel: 0800-812-7792 (was 03-5361-1111 placeholder)
  // Real email: unknown — clear the fake @example.com one
  await db.collection('stores').doc('tokyo-shinjuku').update({
    tel: '0800-812-7792',
    email: '',
    source_url: 'https://minato-shibuya-coating.com/',
  });
  console.log('✓ tokyo-shinjuku: tel updated to 0800-812-7792, email cleared, source_url set');
}

main().catch(err => { console.error(err); process.exit(1); });
