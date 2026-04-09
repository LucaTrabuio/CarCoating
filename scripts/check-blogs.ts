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

  const snap = await db.collection('blog_posts').get();
  console.log(`Total blog posts: ${snap.size}\n`);
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  slug: ${d.slug}`);
    console.log(`  title: ${d.title}`);
    console.log(`  content length: ${(d.content || '').length}`);
    console.log(`  content preview: ${(d.content || '').slice(0, 100)}...`);
    console.log(`  published: ${d.published}`);
    console.log('');
  }
}

main().catch(console.error);
