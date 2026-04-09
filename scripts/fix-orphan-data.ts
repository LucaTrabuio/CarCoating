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

  // Get the page_layout from osaka-umeda as a template
  const umedaDoc = await db.collection('stores').doc('osaka-umeda').get();
  const templateLayout = umedaDoc.data()?.page_layout || '';

  // Fix tokyo-shinjuku: empty page_layout + is_active as string
  await db.collection('stores').doc('tokyo-shinjuku').update({
    is_active: true, // was 'TRUE' string
    page_layout: templateLayout,
    tel: '03-5361-1111', // Fix placeholder tel
  });
  console.log('✓ Fixed tokyo-shinjuku: set is_active=true, copied page_layout, fixed tel');

  // Fix tokyo-shibuya: invalid tel
  await db.collection('stores').doc('tokyo-shibuya').update({
    tel: '03-3464-3651',
  });
  console.log('✓ Fixed tokyo-shibuya: tel');

  console.log('\nDone!');
}

main().catch(console.error);
