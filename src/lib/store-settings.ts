import { getAdminDb } from './firebase-admin';
import type { StoreSettings } from './reservation-types';

const cache = new Map<string, { data: StoreSettings; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_SETTINGS: StoreSettings = {
  calendarId: '',
  notificationEmails: [],
};

export async function getStoreSettings(storeId: string): Promise<StoreSettings> {
  const cached = cache.get(storeId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const db = getAdminDb();
    const doc = await db.collection('storeSettings').doc(storeId).get();
    const data = doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } as StoreSettings : DEFAULT_SETTINGS;
    cache.set(storeId, { data, expiresAt: Date.now() + CACHE_TTL });
    return data;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateStoreSettings(storeId: string, settings: Partial<StoreSettings>): Promise<void> {
  const db = getAdminDb();
  await db.collection('storeSettings').doc(storeId).set(
    { ...settings, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  cache.delete(storeId);
}
