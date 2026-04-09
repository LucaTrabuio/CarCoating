/**
 * Fix news field name: rename 'body' → 'content' in all stores' store_news arrays.
 * Run: npx dotenv -e .env.local -- npx tsx scripts/fix-news-field.ts
 */

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
  console.log(`Checking ${snap.size} stores...`);

  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.store_news || data.store_news === '[]') continue;

    try {
      const items = JSON.parse(data.store_news);
      if (!Array.isArray(items) || items.length === 0) continue;

      let changed = false;
      const fixed = items.map((item: Record<string, unknown>) => {
        if (item.body !== undefined && item.content === undefined) {
          changed = true;
          const { body, ...rest } = item;
          return { ...rest, content: body };
        }
        return item;
      });

      if (changed) {
        await db.collection('stores').doc(doc.id).update({
          store_news: JSON.stringify(fixed),
        });
        updated++;
      }
    } catch { /* skip malformed */ }
  }

  console.log(`Updated ${updated} stores`);
}

main().catch(console.error);
