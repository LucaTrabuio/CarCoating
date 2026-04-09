/**
 * Save calendar IDs to Firestore storeSettings.
 * Run with: npx dotenv -e .env.local -- npx tsx scripts/save-calendar-ids.ts
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const CALENDAR_IDS: Record<string, string> = {
  'sapporo-honten': '3b68f74f6205154a2ba6f50f75cdcf99ba76c0e523a451f56436f280cf1e10dd@group.calendar.google.com',
  'sapporo-minami': '2e7174dbfc5516bdce59224e8a26a1d1a1ab89aebdf34bf4e40e708a4d67dad9@group.calendar.google.com',
  'sapporo-sattsunae': 'ba3528cc7cb940461ce2e1ba1c4204c3b85b5559dd0c5dd128f0b9709c3a5b18@group.calendar.google.com',
  'sapporo-yonnana': '184db9d75a96d3c73290cf9626c91642582ac63fcd5156f7fbcc3f84318a7b2b@group.calendar.google.com',
  'sapporo-mikasa': '2ad3a4888046c89fb08faa8d934a253dc5f162e2da8eff8185be6069ca16e3b8@group.calendar.google.com',
  'osaka-umeda': '51c76a8c71892eff141035ce5ab75fd0f37bb0e9dc3b835d03afdf2c4e6fa48e@group.calendar.google.com',
};

const NOTIFICATION_EMAIL = 'apolloonetest@gmail.com';

async function main() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }

  const db = getFirestore();

  for (const [storeId, calendarId] of Object.entries(CALENDAR_IDS)) {
    await db.collection('storeSettings').doc(storeId).set({
      calendarId,
      notificationEmails: [NOTIFICATION_EMAIL],
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`✓ ${storeId}: calendar ID saved`);
  }

  console.log('\nDone! All store settings saved to Firestore.');
}

main().catch(console.error);
