/**
 * One-time script to create Google Calendar sub-calendars for each store
 * and share them with the main Google account.
 *
 * Run with: npx tsx scripts/setup-calendars.ts
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SHARE_WITH_EMAIL = 'apolloonetest@gmail.com';

const STORES = [
  { id: 'sapporo-honten', name: 'KeePer 札幌本店' },
  { id: 'sapporo-minami', name: 'KeePer 札幌南店' },
  { id: 'sapporo-sattsunae', name: 'KeePer 札苗店' },
  { id: 'sapporo-yonnana', name: 'KeePer よんなな店' },
  { id: 'sapporo-mikasa', name: 'KeePer 三笠店' },
  { id: 'osaka-umeda', name: 'KeePer 大阪梅田店' },
];

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  console.log('Service account:', process.env.FIREBASE_CLIENT_EMAIL);
  console.log(`Will share calendars with: ${SHARE_WITH_EMAIL}\n`);

  const results: { storeId: string; calendarId: string }[] = [];

  for (const store of STORES) {
    console.log(`Creating calendar: ${store.name} 予約...`);
    try {
      // Create the calendar
      const cal = await calendar.calendars.insert({
        requestBody: {
          summary: `${store.name} 予約`,
          description: `KeePer PRO SHOP ${store.name} の予約カレンダー`,
          timeZone: 'Asia/Tokyo',
        },
      });

      const calendarId = cal.data.id!;
      console.log(`  Created: ${calendarId}`);

      // Share with the main account as owner
      await calendar.acl.insert({
        calendarId,
        requestBody: {
          role: 'owner',
          scope: { type: 'user', value: SHARE_WITH_EMAIL },
        },
      });
      console.log(`  Shared with ${SHARE_WITH_EMAIL} as owner`);

      results.push({ storeId: store.id, calendarId });
    } catch (error) {
      console.error(`  FAILED:`, (error as Error).message);
    }
  }

  console.log('\n=== Results ===');
  console.log('Copy these calendar IDs to store settings:\n');
  for (const r of results) {
    console.log(`${r.storeId}: ${r.calendarId}`);
  }

  console.log('\n=== Firestore update commands ===');
  console.log('Run the following API calls to save calendar IDs to store settings:\n');
  for (const r of results) {
    console.log(`curl -X PUT http://localhost:8080/api/admin/store-settings \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"storeId":"${r.storeId}","calendarId":"${r.calendarId}","notificationEmails":["${SHARE_WITH_EMAIL}"]}'`);
    console.log('');
  }
}

main().catch(console.error);
