/**
 * Rollout-day migration: sets mustChangePassword=true and
 * passwordChangedAt=(now−91d) on every existing admin user that
 * lacks the passwordChangedAt field. Idempotent.
 *
 * Usage: npx tsx scripts/backfill-admin-passwordChangedAt.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

function ensureApp() {
  if (getApps().length > 0) return getApps()[0];
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  });
}

async function main() {
  ensureApp();
  const db = getFirestore();

  const snap = await db.collection('users').get();
  let updated = 0;
  let skipped = 0;

  const now = new Date();
  // 91 days ago = already expired
  const passwordChangedAt = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.passwordChangedAt) {
      skipped++;
      continue;
    }
    await doc.ref.update({
      passwordChangedAt,
      mustChangePassword: true,
    });
    updated++;
    console.log(`Updated ${doc.id} (${data.email})`);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already had passwordChangedAt): ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
