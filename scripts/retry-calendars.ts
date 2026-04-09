/**
 * Retry creating calendars for stores that don't have one yet.
 * Run periodically until all are created (rate limits reset over time).
 *
 * Run with: npx dotenv -e .env.local -- npx tsx scripts/retry-calendars.ts
 */

import { google } from 'googleapis';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const SHARE_WITH_EMAIL = 'apolloonetest@gmail.com';

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

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  // Get all stores
  const storesSnap = await db.collection('stores').get();
  const allStores = storesSnap.docs.map(d => ({ id: d.id, name: d.data().store_name }));

  // Get stores that already have calendars
  const settingsSnap = await db.collection('storeSettings').get();
  const hasCalendar = new Set(
    settingsSnap.docs
      .filter(d => d.data().calendarId && d.data().calendarId.length > 10)
      .map(d => d.id)
  );

  const missing = allStores.filter(s => !hasCalendar.has(s.id));
  console.log(`Total stores: ${allStores.length}`);
  console.log(`Already have calendar: ${hasCalendar.size}`);
  console.log(`Missing calendar: ${missing.length}`);

  if (missing.length === 0) {
    console.log('\nAll stores have calendars!');
    return;
  }

  console.log(`\nCreating ${missing.length} calendars...`);
  let created = 0;
  let rateLimited = 0;

  for (const store of missing) {
    try {
      const cal = await calendar.calendars.insert({
        requestBody: {
          summary: `KeePer ${store.name}`,
          description: `KeePer PRO SHOP ${store.name} 予約カレンダー`,
          timeZone: 'Asia/Tokyo',
        },
      });

      const calendarId = cal.data.id!;

      await calendar.acl.insert({
        calendarId,
        sendNotifications: false,
        requestBody: {
          role: 'writer',
          scope: { type: 'user', value: SHARE_WITH_EMAIL },
        },
      });

      await db.collection('storeSettings').doc(store.id).set({
        calendarId,
        notificationEmails: [SHARE_WITH_EMAIL],
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      created++;
      if (created % 5 === 0) console.log(`  Created: ${created}`);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('Rate Limit') || msg.includes('usage limits')) {
        rateLimited++;
        if (rateLimited === 1) console.log('  Hit rate limit, stopping...');
        break;
      }
      console.error(`  FAILED ${store.id}: ${msg}`);
    }
  }

  console.log(`\nResults: Created ${created}, Rate limited: ${rateLimited > 0 ? 'yes' : 'no'}`);
  console.log(`Remaining: ${missing.length - created}`);
  if (missing.length - created > 0) {
    console.log('Run this script again later to create the remaining calendars.');
  }
}

main().catch(console.error);
