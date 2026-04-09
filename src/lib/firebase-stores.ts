import { getAdminDb } from './firebase-admin';
import { V3StoreData, V3_CSV_COLUMNS, defaultV3Store } from './v3-types';
import type { CampaignDefaults } from './types';
import { MAX_CSV_ROWS } from './constants';

const STORES_COLLECTION = 'stores';
const CAMPAIGNS_COLLECTION = 'campaigns';
const CAMPAIGN_DOC_ID = 'defaults';

// ─── Store CRUD ──────────────────────────────────────────────

/** Normalize Firestore doc to V3StoreData with proper types.
 *  CSV import stores booleans as strings and numbers as strings — fix them here once. */
function toBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  return false;
}

function toNum(val: unknown, fallback: number, label?: string): number {
  const n = Number(val);
  if (isNaN(n)) {
    if (label) console.warn(`normalizeStore: "${label}" could not be parsed as number, using ${fallback}`);
    return fallback;
  }
  return n;
}

function normalizeStore(raw: Record<string, unknown>): V3StoreData {
  return {
    ...raw,
    is_active: toBool(raw.is_active),
    has_booth: toBool(raw.has_booth),
    lat: toNum(raw.lat, 0, 'lat'),
    lng: toNum(raw.lng, 0, 'lng'),
    discount_rate: toNum(raw.discount_rate, 0, 'discount_rate'),
    parking_spaces: toNum(raw.parking_spaces, 0, 'parking_spaces'),
    level1_staff_count: toNum(raw.level1_staff_count, 0, 'level1_staff_count'),
    level2_staff_count: toNum(raw.level2_staff_count, 0, 'level2_staff_count'),
    price_multiplier: toNum(raw.price_multiplier, 1.0, 'price_multiplier'),
    min_price_limit: toNum(raw.min_price_limit, 0, 'min_price_limit'),
  } as V3StoreData;
}

export async function getAllV3Stores(): Promise<V3StoreData[]> {
  const snapshot = await getAdminDb().collection(STORES_COLLECTION).get();
  return snapshot.docs
    .map(doc => normalizeStore(doc.data()))
    .filter(s => s.is_active);
}

export async function getAllV3StoresIncludingInactive(): Promise<V3StoreData[]> {
  const snapshot = await getAdminDb().collection(STORES_COLLECTION).get();
  return snapshot.docs.map(doc => normalizeStore(doc.data()));
}

export async function getV3StoreById(storeId: string): Promise<V3StoreData | null> {
  const doc = await getAdminDb().collection(STORES_COLLECTION).doc(storeId).get();
  if (!doc.exists) return null;
  return normalizeStore(doc.data()!);
}

export async function getAllV3StoreIds(): Promise<string[]> {
  const stores = await getAllV3Stores();
  return stores.map(s => s.store_id);
}

export async function upsertV3Store(store: V3StoreData): Promise<void> {
  await getAdminDb()
    .collection(STORES_COLLECTION)
    .doc(store.store_id)
    .set(store, { merge: true });
}

export async function upsertV3Stores(stores: V3StoreData[]): Promise<void> {
  // Firestore batch max is 500
  const batchSize = 500;
  for (let i = 0; i < stores.length; i += batchSize) {
    const batch = getAdminDb().batch();
    const chunk = stores.slice(i, i + batchSize);
    for (const store of chunk) {
      const ref = getAdminDb().collection(STORES_COLLECTION).doc(store.store_id);
      batch.set(ref, store, { merge: true });
    }
    await batch.commit();
  }
}

export async function softDeleteV3Store(storeId: string): Promise<void> {
  await getAdminDb()
    .collection(STORES_COLLECTION)
    .doc(storeId)
    .update({ is_active: false });
}

// ─── CSV Export ──────────────────────────────────────────────

export async function exportV3StoresToCSV(): Promise<string> {
  const stores = await getAllV3StoresIncludingInactive();
  const header = V3_CSV_COLUMNS.join(',');
  const rows = stores.map(store =>
    V3_CSV_COLUMNS.map(col => {
      const val = store[col];
      const str = val === null || val === undefined ? '' : String(val);
      // Wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

// ─── CSV Import (parse CSV row to V3StoreData) ──────────────

function safeJsonString(val: string, fallback: string = '[]'): string {
  if (!val || val === fallback) return fallback;
  try { JSON.parse(val); return val; } catch { return fallback; }
}

function clampNum(val: number, min: number, max: number, fallback: number): number {
  if (isNaN(val)) return fallback;
  if (val < min || val > max) return fallback;
  return val;
}

export function parseCSVToV3Stores(csvText: string): V3StoreData[] {
  // Remove BOM if present
  const text = csvText.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  if (lines.length - 1 > MAX_CSV_ROWS) {
    throw new Error(`CSV exceeds maximum of ${MAX_CSV_ROWS} rows`);
  }

  const headers = parseCSVLine(lines[0]);
  const stores: V3StoreData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) raw[h.trim()] = (values[idx] || '').trim();
    });

    if (!raw.store_id || !raw.store_name) continue;

    stores.push(defaultV3Store({
      store_id: raw.store_id,
      store_name: raw.store_name,
      is_active: raw.is_active !== undefined ? raw.is_active.toLowerCase() !== 'false' : true,
      address: raw.address || '',
      postal_code: raw.postal_code || '',
      prefecture: raw.prefecture || '',
      city: raw.city || '',
      tel: raw.tel || '',
      business_hours: raw.business_hours || '',
      regular_holiday: raw.regular_holiday || '',
      email: raw.email || '',
      line_url: raw.line_url || '',
      lat: clampNum(parseFloat(raw.lat), -90, 90, 0),
      lng: clampNum(parseFloat(raw.lng), -180, 180, 0),
      parking_spaces: parseInt(raw.parking_spaces) || 0,
      landmark: raw.landmark || '',
      nearby_stations: safeJsonString(raw.nearby_stations || '', '[]'),
      access_map_url: raw.access_map_url || '',
      campaign_title: raw.campaign_title || '',
      campaign_deadline: raw.campaign_deadline || '',
      discount_rate: clampNum(parseFloat(raw.discount_rate), 0, 100, 20),
      campaign_color_code: raw.campaign_color_code || '#c49a2a',
      hero_title: raw.hero_title || '',
      hero_subtitle: raw.hero_subtitle || '',
      description: raw.description || '',
      meta_description: raw.meta_description || '',
      seo_keywords: raw.seo_keywords || '',
      hero_image_url: raw.hero_image_url || '',
      logo_url: raw.logo_url || '',
      staff_photo_url: raw.staff_photo_url || '',
      store_exterior_url: raw.store_exterior_url || '',
      store_interior_url: raw.store_interior_url || '',
      before_after_url: raw.before_after_url || '',
      campaign_banner_url: raw.campaign_banner_url || '',
      gallery_images: safeJsonString(raw.gallery_images || '', '[]'),
      custom_services: safeJsonString(raw.custom_services || '', '[]'),
      price_multiplier: clampNum(parseFloat(raw.price_multiplier), 0, 10, 1.0),
      min_price_limit: parseFloat(raw.min_price_limit) || 0,
      has_booth: raw.has_booth?.toLowerCase() === 'true',
      level1_staff_count: parseInt(raw.level1_staff_count) || 0,
      level2_staff_count: parseInt(raw.level2_staff_count) || 0,
      google_place_id: raw.google_place_id || '',
    }));
  }

  return stores;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ─── Campaign Defaults ──────────────────────────────────────

const DEFAULT_CAMPAIGN: CampaignDefaults = {
  title: '春の新生活キャンペーン',
  color: '#001AFF',
  start: '2026-04-01',
  end: '2026-04-30',
  discount: 20,
};

export async function getV3CampaignDefaults(): Promise<CampaignDefaults> {
  try {
    const doc = await getAdminDb()
      .collection(CAMPAIGNS_COLLECTION)
      .doc(CAMPAIGN_DOC_ID)
      .get();
    if (!doc.exists) return DEFAULT_CAMPAIGN;
    return doc.data() as CampaignDefaults;
  } catch {
    return DEFAULT_CAMPAIGN;
  }
}

export async function saveV3CampaignDefaults(data: CampaignDefaults): Promise<void> {
  await getAdminDb()
    .collection(CAMPAIGNS_COLLECTION)
    .doc(CAMPAIGN_DOC_ID)
    .set(data);
}

// ─── Sub-company functions ─────────────────────────────────

export interface SubCompany {
  id: string;
  name: string;
  slug: string;
  stores: string[];
  logo_url: string;
  description: string;
}

export async function getAllSubCompanies(): Promise<SubCompany[]> {
  const db = getAdminDb();
  const snapshot = await db.collection('sub_companies').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubCompany));
}

export async function getSubCompanyBySlug(slug: string): Promise<SubCompany | null> {
  const db = getAdminDb();
  const snapshot = await db.collection('sub_companies').where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as SubCompany;
}

export async function getStoreBySlug(subCompanySlug: string, storeSlug: string): Promise<V3StoreData | null> {
  const subCompany = await getSubCompanyBySlug(subCompanySlug);
  if (!subCompany) return null;

  const db = getAdminDb();
  const snapshot = await db.collection('stores')
    .where('sub_company_id', '==', subCompany.id)
    .where('store_slug', '==', storeSlug)
    .where('is_active', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return normalizeStore(snapshot.docs[0].data());
}

export async function getStoresBySubCompany(subCompanyId: string): Promise<V3StoreData[]> {
  const db = getAdminDb();
  const snapshot = await db.collection('stores')
    .where('sub_company_id', '==', subCompanyId)
    .where('is_active', '==', true)
    .get();
  return snapshot.docs.map(doc => normalizeStore(doc.data()));
}

/**
 * Resolve a URL slug to a store. Accepts either a direct store ID or a
 * sub-company slug. For sub-companies, returns the primary (first) active store.
 * Used by shared pages (coatings, options, price, etc.) so they work for both.
 */
export async function resolveSlugToStore(slug: string): Promise<{
  store: V3StoreData;
  isSubCompany: boolean;
  subCompanyName?: string;
} | null> {
  const store = await getV3StoreById(slug);
  if (store && store.is_active) {
    return { store, isSubCompany: false };
  }
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    const stores = await getStoresBySubCompany(subCompany.id);
    if (stores.length === 0) return null;
    return { store: stores[0], isSubCompany: true, subCompanyName: subCompany.name };
  }
  return null;
}

export async function upsertSubCompany(subCompany: SubCompany): Promise<void> {
  const db = getAdminDb();
  await db.collection('sub_companies').doc(subCompany.id).set(subCompany, { merge: true });
}
