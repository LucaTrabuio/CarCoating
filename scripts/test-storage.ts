import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: 'keeper-pro-shop.appspot.com',
    });
  }
  const bucket = getStorage().bucket();
  console.log('Bucket:', bucket.name);
  const [files] = await bucket.getFiles({ maxResults: 5 });
  console.log('Files:', files.length);
  files.forEach(f => console.log(' ', f.name));
}

main().catch(console.error);
