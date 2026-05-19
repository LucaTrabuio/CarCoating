import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { systemAlerts } from './system-alerts-instance';

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

  try {
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
  } catch (err) {
    try {
      await systemAlerts.recordAlert({
        source: 'customer-sync',
        severity: 'warning',
        title: 'Customer upsert failed',
        payload: { storeId, error: String(err) },
        dedupeKey: `customer-sync:${storeId}`,
      });
    } catch { /* never let alert recording corrupt the calling flow */ }
    throw err;
  }
}

export interface GetCustomersOptions {
  storeId: string;
  q?: string;
  limit?: number;
  startAfter?: string;
}

export interface CustomerRecordWithStore extends CustomerRecord {
  storeId: string;
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

/**
 * Aggregates customers across the given storeIds via per-store fan-out.
 * Used by super_admin's "全店舗" view. Each returned record carries its
 * own storeId so the UI can route the detail click to the correct doc.
 */
export async function getCustomersAcrossStores(opts: {
  storeIds: string[];
  q?: string;
  limit?: number;
}): Promise<CustomerRecordWithStore[]> {
  const { storeIds, q, limit = 50 } = opts;
  if (storeIds.length === 0) return [];
  const db = getAdminDb();

  const perStorePromises = storeIds.map(async (storeId) => {
    const snap = await db
      .collection('stores')
      .doc(storeId)
      .collection('customers')
      .orderBy('lastInteractionAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({
      ...(d.data() as CustomerRecord),
      email: d.id,
      storeId,
    } as CustomerRecordWithStore));
  });

  const perStoreResults = await Promise.all(perStorePromises);
  let merged = perStoreResults.flat();

  // Sort by lastInteractionAt desc, slice to limit
  merged.sort((a, b) =>
    (b.lastInteractionAt || '').localeCompare(a.lastInteractionAt || ''),
  );

  if (q) {
    const lower = q.toLowerCase();
    merged = merged.filter(
      (c) =>
        c.email.includes(lower) ||
        (c.name || '').toLowerCase().includes(lower) ||
        (c.nameKana || '').toLowerCase().includes(lower) ||
        (c.phone || '').includes(q),
    );
  }

  return merged.slice(0, limit);
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
