/**
 * Create Google Calendars under apolloonetest@gmail.com using OAuth.
 *
 * One-time setup:
 * 1. Add http://localhost:4200/oauth2callback to the OAuth client's authorized redirect URIs
 *    in Google Cloud Console → APIs & Services → Credentials → Edit OAuth client
 * 2. Run: npx dotenv -e .env.local -- npx tsx scripts/oauth-create-calendars.ts
 * 3. Open the URL it prints, log in as apolloonetest@gmail.com, grant permission
 * 4. Script captures the token, saves it, and creates all 97 calendars
 *
 * Subsequent runs re-use the saved refresh token (no browser needed).
 */

import { google } from 'googleapis';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:4200/oauth2callback';
const TOKEN_PATH = path.resolve(__dirname, '.oauth-token.json');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.local');
  process.exit(1);
}

async function getRefreshToken(): Promise<string> {
  // Check if we have a saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const saved = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    if (saved.refresh_token) {
      console.log('Using saved refresh token.');
      return saved.refresh_token;
    }
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  OAUTH AUTHORIZATION REQUIRED                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nOpen this URL in your browser and log in as apolloonetest@gmail.com:\n');
  console.log(authUrl);
  console.log('\nWaiting for authorization callback on port 4200...\n');

  return new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) return;
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.pathname !== '/oauth2callback') {
          res.writeHead(404);
          res.end();
          return;
        }
        const code = parsedUrl.query.code as string;
        if (!code) {
          res.writeHead(400);
          res.end('Missing code');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✓ Authorization successful</h1><p>You can close this window.</p>');

        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.refresh_token) {
          reject(new Error('No refresh_token returned. Try revoking access at https://myaccount.google.com/permissions and retry.'));
          return;
        }

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log(`✓ Refresh token saved to ${TOKEN_PATH}`);
        server.close();
        resolve(tokens.refresh_token);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(4200, () => {
      // Ready
    });
  });
}

async function main() {
  const refreshToken = await getRefreshToken();

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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

  // Get all stores and identify missing calendars
  const storesSnap = await db.collection('stores').get();
  const allStores = storesSnap.docs.map(d => ({ id: d.id, name: d.data().store_name }));

  const settingsSnap = await db.collection('storeSettings').get();
  const existingCals = new Map<string, string>();
  for (const doc of settingsSnap.docs) {
    const cid = doc.data().calendarId;
    if (cid && cid.length > 10) existingCals.set(doc.id, cid);
  }

  const missing = allStores.filter(s => !existingCals.has(s.id));
  console.log(`\nTotal stores: ${allStores.length}`);
  console.log(`Already have calendar: ${existingCals.size}`);
  console.log(`Missing calendar: ${missing.length}`);

  if (missing.length === 0) {
    console.log('\n✓ All stores already have calendars!');
    return;
  }

  // Optionally delete old service-account-owned calendars first
  console.log('\nDeleting old service-account-owned calendars (so they no longer appear as "My calendars")...');
  let deleted = 0;
  for (const [storeId, oldCalId] of existingCals.entries()) {
    // Only delete if it looks like a group calendar ID (from service account)
    if (oldCalId.includes('@group.calendar.google.com')) {
      try {
        // Try to delete it via the service account
        const { google: g2 } = await import('googleapis');
        const serviceAuth = new g2.auth.GoogleAuth({
          credentials: {
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        const serviceCal = g2.calendar({ version: 'v3', auth: serviceAuth });
        await serviceCal.calendars.delete({ calendarId: oldCalId });
        deleted++;
        // Remove from existing so it'll get recreated
        existingCals.delete(storeId);
        missing.push({ id: storeId, name: allStores.find(s => s.id === storeId)?.name || storeId });
      } catch (err) {
        // Skip on error
      }
    }
  }
  console.log(`Deleted ${deleted} old calendars.`);

  console.log(`\nCreating ${missing.length} calendars under apolloonetest@gmail.com...`);
  let created = 0;
  let failed = 0;

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

      // Share with service account so booking API can write to it
      await calendar.acl.insert({
        calendarId,
        sendNotifications: false,
        requestBody: {
          role: 'writer',
          scope: { type: 'user', value: process.env.FIREBASE_CLIENT_EMAIL! },
        },
      });

      // Save to Firestore
      await db.collection('storeSettings').doc(store.id).set({
        calendarId,
        notificationEmails: ['apolloonetest@gmail.com'],
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      created++;
      if (created % 10 === 0) console.log(`  Progress: ${created}/${missing.length}`);
    } catch (error) {
      console.error(`  FAILED ${store.id}: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(`\n✓ Created: ${created}, Failed: ${failed}`);
  console.log('\nAll calendars should now appear under "My calendars" in apolloonetest@gmail.com\'s Google Calendar.');
}

main().catch(console.error);
