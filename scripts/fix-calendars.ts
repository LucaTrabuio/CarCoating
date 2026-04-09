/**
 * Delete existing KeePer calendars and recreate them with writer role
 * so they appear under "Other calendars" instead of "My calendars".
 *
 * Run with: npx dotenv -e .env.local -- npx tsx scripts/fix-calendars.ts
 */

import { google } from 'googleapis';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const SHARE_WITH_EMAIL = 'apolloonetest@gmail.com';

// Load store data
const storeData = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'store-data.json'), 'utf8'));
const stores: { storeId: string; storeName: string }[] = storeData.stores;

// Old calendar IDs to delete
const OLD_CALENDAR_IDS = [
  '3b68f74f6205154a2ba6f50f75cdcf99ba76c0e523a451f56436f280cf1e10dd@group.calendar.google.com',
  '2e7174dbfc5516bdce59224e8a26a1d1a1ab89aebdf34bf4e40e708a4d67dad9@group.calendar.google.com',
  'ba3528cc7cb940461ce2e1ba1c4204c3b85b5559dd0c5dd128f0b9709c3a5b18@group.calendar.google.com',
  '184db9d75a96d3c73290cf9626c91642582ac63fcd5156f7fbcc3f84318a7b2b@group.calendar.google.com',
  '2ad3a4888046c89fb08faa8d934a253dc5f162e2da8eff8185be6069ca16e3b8@group.calendar.google.com',
  '51c76a8c71892eff141035ce5ab75fd0f37bb0e9dc3b835d03afdf2c4e6fa48e@group.calendar.google.com',
];

async function main() {
  // Init Firebase
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

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  // Step 1: Delete old calendars
  console.log('Deleting old calendars...');
  for (const calId of OLD_CALENDAR_IDS) {
    try {
      await calendar.calendars.delete({ calendarId: calId });
      console.log(`  Deleted: ${calId.slice(0, 20)}...`);
    } catch (e) {
      console.log(`  Skip (already deleted): ${calId.slice(0, 20)}...`);
    }
  }

  // Step 2: Create new calendars for ALL stores and share with writer role
  console.log(`\nCreating ${stores.length} calendars...`);
  let created = 0;
  let failed = 0;

  for (const store of stores) {
    const calName = `KeePer ${store.storeName}`;
    try {
      const cal = await calendar.calendars.insert({
        requestBody: {
          summary: calName,
          description: `KeePer PRO SHOP ${store.storeName} 予約カレンダー`,
          timeZone: 'Asia/Tokyo',
        },
      });

      const calendarId = cal.data.id!;

      // Share with WRITER role (appears under "Other calendars")
      await calendar.acl.insert({
        calendarId,
        sendNotifications: false, // Don't send invite email
        requestBody: {
          role: 'writer',
          scope: { type: 'user', value: SHARE_WITH_EMAIL },
        },
      });

      // Save to Firestore
      await db.collection('storeSettings').doc(store.storeId).set({
        calendarId,
        notificationEmails: [SHARE_WITH_EMAIL],
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      created++;
      if (created % 10 === 0) console.log(`  Progress: ${created}/${stores.length}`);
    } catch (error) {
      console.error(`  FAILED ${store.storeId}: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone! Created: ${created}, Failed: ${failed}`);
}

main().catch(console.error);
