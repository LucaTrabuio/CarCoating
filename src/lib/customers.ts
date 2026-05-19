import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CustomerRecord {
  email: string;
  name: string;
  nameKana?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  bookingCount: number;
  inquiryCount: number;
  lastInteractionAt: string;
  createdAt: string;
  updatedAt: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface UpsertCustomerInput {
  storeId: string;
  email: string;
  name?: string;
  nameKana?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  source: 'booking' | 'inquiry';
}

/**
 * Upsert customer in stores/{storeId}/customers/{normalizedEmail}.
 * - New doc: creates with the matching counter = 1, other = 0.
 * - Existing doc: increments matching counter.
 * - Empty incoming fields do NOT overwrite non-empty stored fields.
 */
export async function upsertCustomer(input: UpsertCustomerInput): Promise<void> {
  const { storeId, source, ...fields } = input;
  const email = normalizeEmail(fields.email);
  const db = getAdminDb();
  const ref = db.collection('stores').doc(storeId).collection('customers').doc(email);

  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      const doc: CustomerRecord = {
        email,
        name: fields.name?.trim() || '',
        nameKana: fields.nameKana?.trim() || undefined,
        phone: fields.phone?.trim() || undefined,
        postalCode: fields.postalCode?.trim() || undefined,
        address: fields.address?.trim() || undefined,
        bookingCount: source === 'booking' ? 1 : 0,
        inquiryCount: source === 'inquiry' ? 1 : 0,
        lastInteractionAt: now,
        createdAt: now,
        updatedAt: now,
      };
      // Remove undefined fields
      const clean = Object.fromEntries(
        Object.entries(doc).filter(([, v]) => v !== undefined)
      );
      tx.set(ref, clean);
      return;
    }

    const existing = snap.data() as CustomerRecord;

    const updates: Record<string, unknown> = {
      lastInteractionAt: now,
      updatedAt: now,
    };

    if (source === 'booking') {
      updates.bookingCount = FieldValue.increment(1);
    } else {
      updates.inquiryCount = FieldValue.increment(1);
    }

    // Fill only if empty
    if (fields.name?.trim() && !existing.name) {
      updates.name = fields.name.trim();
    }
    if (fields.nameKana?.trim() && !existing.nameKana) {
      updates.nameKana = fields.nameKana.trim();
    }
    if (fields.phone?.trim() && !existing.phone) {
      updates.phone = fields.phone.trim();
    }
    if (fields.postalCode?.trim() && !existing.postalCode) {
      updates.postalCode = fields.postalCode.trim();
    }
    if (fields.address?.trim() && !existing.address) {
      updates.address = fields.address.trim();
    }

    tx.update(ref, updates);
  });
}

export interface GetCustomersOptions {
  storeId: string;
  q?: string;
  limit?: number;
  startAfter?: string;
}

export async function getCustomers(opts: GetCustomersOptions): Promise<CustomerRecord[]> {
  const { storeId, q, limit = 50 } = opts;
  const db = getAdminDb();
  const query = db
    .collection('stores')
    .doc(storeId)
    .collection('customers')
    .orderBy('lastInteractionAt', 'desc')
    .limit(limit);

  const snap = await query.get();
  const all = snap.docs.map((d) => ({ email: d.id, ...d.data() } as CustomerRecord));

  if (q) {
    const lower = q.toLowerCase();
    return all.filter(
      (c) =>
        c.email.includes(lower) ||
        (c.name || '').toLowerCase().includes(lower) ||
        (c.nameKana || '').toLowerCase().includes(lower) ||
        (c.phone || '').includes(q),
    );
  }

  return all;
}

export async function getCustomer(storeId: string, email: string): Promise<CustomerRecord | null> {
  const db = getAdminDb();
  const snap = await db
    .collection('stores')
    .doc(storeId)
    .collection('customers')
    .doc(normalizeEmail(email))
    .get();

  if (!snap.exists) return null;
  return { email: snap.id, ...snap.data() } as CustomerRecord;
}
