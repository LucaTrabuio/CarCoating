/**
 * Idempotent migration: sets notificationOptIn: true on the user doc whose
 * email is l.trabuio@meetsc.co.jp so they receive system alerts and daily
 * reports immediately after the feature lands.
 *
 * Usage:
 *   npx tsx scripts/backfill-l-trabuio-optin.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TARGET_EMAIL = 'l.trabuio@meetsc.co.jp';

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n');
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });
}

const db = getFirestore();

async function run() {
  const snap = await db.collection('users').where('email', '==', TARGET_EMAIL).get();

  if (snap.empty) {
    console.error(`No user found with email ${TARGET_EMAIL}`);
    process.exit(1);
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.notificationOptIn === true) {
      console.log(`${doc.id} (${TARGET_EMAIL}): already opted in, skipping`);
      continue;
    }
    await doc.ref.update({ notificationOptIn: true });
    console.log(`${doc.id} (${TARGET_EMAIL}): notificationOptIn set to true`);
  }

  console.log('done');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
