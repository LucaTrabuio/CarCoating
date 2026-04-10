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

  // yokohama-base = アクティブコレクション 横浜本店 (ベース = 本店 "main/base store")
  // Source: https://coating-yokohama.com/map_yutai.html
  await db.collection('stores').doc('yokohama-base').update({
    tel: '0800-812-7757',
    address: '神奈川県横浜市都筑区仲町台4-8-20',
    postal_code: '224-0041',
  });
  console.log('✓ yokohama-base: set tel=0800-812-7757, address, postal_code=224-0041');
}

main().catch(err => { console.error(err); process.exit(1); });
