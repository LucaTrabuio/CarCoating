/**
 * One-time customer collection backfill from existing inquiries and
 * reservations. Idempotent (upsert with increment).
 *
 * Usage: npx tsx scripts/backfill-customers-from-inquiries-bookings.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

interface CustomerAgg {
  email: string;
  name: string;
  phone?: string;
  bookingCount: number;
  inquiryCount: number;
  lastInteractionAt: string;
  createdAt: string;
}

async function main() {
  ensureApp();
  const db = getFirestore();

  // Aggregate per storeId → email
  const agg = new Map<string, Map<string, CustomerAgg>>();

  // Process inquiries
  const inquiriesSnap = await db.collection('inquiries').get();
  for (const doc of inquiriesSnap.docs) {
    const d = doc.data();
    if (!d.customerEmail || !d.storeId) continue;

    const email = d.customerEmail.trim().toLowerCase();
    const storeId: string = d.storeId;
    const at: string = d.createdAt || new Date().toISOString();

    if (!agg.has(storeId)) agg.set(storeId, new Map());
    const storeMap = agg.get(storeId)!;

    if (storeMap.has(email)) {
      const c = storeMap.get(email)!;
      c.inquiryCount++;
      if (at > c.lastInteractionAt) c.lastInteractionAt = at;
      if (!c.phone && d.customerPhone?.trim()) c.phone = d.customerPhone.trim();
      if (!c.name && d.customerName?.trim()) c.name = d.customerName.trim();
    } else {
      storeMap.set(email, {
        email,
        name: d.customerName?.trim() || '',
        phone: d.customerPhone?.trim() || undefined,
        bookingCount: 0,
        inquiryCount: 1,
        lastInteractionAt: at,
        createdAt: at,
      });
    }
  }

  // Process reservations
  const reservationsSnap = await db.collection('reservations').get();
  for (const doc of reservationsSnap.docs) {
    const d = doc.data();
    if (!d.customerEmail && !d.email) continue;
    if (!d.storeId) continue;

    const email = (d.customerEmail || d.email || '').trim().toLowerCase();
    const storeId: string = d.storeId;
    const at: string = d.createdAt || new Date().toISOString();

    if (!agg.has(storeId)) agg.set(storeId, new Map());
    const storeMap = agg.get(storeId)!;

    const name = (d.customerName || d.name || '').trim();
    const phone = (d.customerPhone || d.phone || '').trim() || undefined;

    if (storeMap.has(email)) {
      const c = storeMap.get(email)!;
      c.bookingCount++;
      if (at > c.lastInteractionAt) c.lastInteractionAt = at;
      if (!c.phone && phone) c.phone = phone;
      if (!c.name && name) c.name = name;
    } else {
      storeMap.set(email, {
        email,
        name,
        phone,
        bookingCount: 1,
        inquiryCount: 0,
        lastInteractionAt: at,
        createdAt: at,
      });
    }
  }

  // Write to Firestore
  let totalWritten = 0;
  for (const [storeId, storeMap] of agg.entries()) {
    for (const [email, c] of storeMap.entries()) {
      const ref = db.collection('stores').doc(storeId).collection('customers').doc(email);
      const snap = await ref.get();

      if (snap.exists) {
        // Increment — don't overwrite historical counts
        const existing = snap.data()!;
        await ref.update({
          bookingCount: FieldValue.increment(c.bookingCount),
          inquiryCount: FieldValue.increment(c.inquiryCount),
          lastInteractionAt: c.lastInteractionAt > (existing.lastInteractionAt || '') ? c.lastInteractionAt : existing.lastInteractionAt,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const doc: Record<string, unknown> = {
          email: c.email,
          name: c.name,
          bookingCount: c.bookingCount,
          inquiryCount: c.inquiryCount,
          lastInteractionAt: c.lastInteractionAt,
          createdAt: c.createdAt,
          updatedAt: new Date().toISOString(),
        };
        if (c.phone) doc.phone = c.phone;
        await ref.set(doc);
      }

      totalWritten++;
    }
    console.log(`Store ${storeId}: ${storeMap.size} customers`);
  }

  console.log(`\nDone. Total customers written/updated: ${totalWritten}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
