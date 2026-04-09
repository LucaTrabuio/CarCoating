/**
 * Seed Firestore with all 97 stores and 52 sub-companies.
 *
 * Reads store-data.json (97 stores + sub-company groupings) and
 * scraped-store-info.json (addresses, phones, hours, coords) to build
 * V3StoreData objects and upsert them into Firestore.
 *
 * Run with:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-all-stores.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────

interface StoreEntry {
  no: number;
  company: string;
  area: string;
  storeName: string;
  ssName: string;
  url: string;
  siteGroup: number | null;
  storeId: string;
  discounts: Record<string, number | string>;
  newCarBonus: string;
  optionDiscount: string;
  notes: string;
}

interface SubCompanyEntry {
  slug: string;
  name: string;
  url: string;
  storeIds: string[];
}

interface ScrapedStore {
  storeName: string;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  phoneLocal?: string | null;
  businessHours: string | null;
  holidays: string | null;
  coordinates: { lat: number; lng: number } | null;
  access: string[];
  appealPoints: string[];
  notes?: string;
}

interface ScrapedDomain {
  domain: string;
  url: string;
  company: string | null;
  stores: ScrapedStore[];
  error?: string;
  _note?: string;
}

// ─── Load data ────────────────────────────────────────────────────────────

const storeDataPath = path.resolve(__dirname, 'store-data.json');
const scrapedDataPath = path.resolve(__dirname, 'scraped-store-info.json');

const storeData: { stores: StoreEntry[]; subCompanies: SubCompanyEntry[] } =
  JSON.parse(fs.readFileSync(storeDataPath, 'utf8'));

const scrapedData: Record<string, ScrapedDomain> =
  JSON.parse(fs.readFileSync(scrapedDataPath, 'utf8'));

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Extract domain from a full URL (e.g. "https://sapporo-coating.com/" -> "sapporo-coating.com") */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/** Clean postal code: remove 〒 prefix and trim */
function cleanPostalCode(raw: string | null): string {
  if (!raw) return '';
  return raw.replace(/^〒\s*/, '').trim();
}

/** Extract prefecture from a Japanese address */
function extractPrefecture(address: string | null): string {
  if (!address) return '';
  // Matches patterns like 北海道, 東京都, 大阪府, 神奈川県, etc.
  const m = address.match(/^(北海道|東京都|大阪府|京都府|.{2,3}県)/);
  return m ? m[1] : '';
}

/** Extract city from a Japanese address (after prefecture, before the first digit or 丁目) */
function extractCity(address: string | null): string {
  if (!address) return '';
  const pref = extractPrefecture(address);
  const rest = pref ? address.slice(pref.length) : address;
  // City is typically up to the first number, 丁目, or specific sub-area markers
  const m = rest.match(/^(.+?(?:市|区|郡.+?町|郡.+?村|町|村))/);
  return m ? m[1] : '';
}

/**
 * Compute the best discount rate from a store's discounts object.
 * We take the highest numeric value among the main coating tiers
 * (crystal, diamond, wDiamond, ecoPlus), ignoring string values like exRaw.
 */
function computeDiscountRate(discounts: Record<string, number | string>): number {
  const keys = ['crystal', 'fresh', 'diamond', 'wDiamond', 'dia2', 'ecoPlus'];
  let maxRate = 0;
  for (const key of keys) {
    const val = discounts[key];
    if (typeof val === 'number' && val > maxRate) {
      maxRate = val;
    }
  }
  return maxRate;
}

/**
 * Build a lookup: for each store_id -> its sub-company slug.
 * This is derived from the subCompanies array.
 */
function buildStoreToSubCompanyMap(subCompanies: SubCompanyEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const sc of subCompanies) {
    for (const sid of sc.storeIds) {
      map.set(sid, sc.slug);
    }
  }
  return map;
}

/**
 * Derive store_slug from store_id.
 * For IDs like "sapporo-sattsunae", we keep the full ID as the slug
 * (the sub-company context provides the area prefix).
 */
function deriveStoreSlug(storeId: string): string {
  return storeId;
}

/**
 * Manual overrides for stores where automated name matching fails.
 * Maps store_id -> scraped storeName (or partial match string).
 */
const MANUAL_MATCH_OVERRIDES: Record<string, string> = {
  // "たけべ" (hiragana) in store-data vs "建部" (kanji) in scraped data
  'okayama-takebe': '建部',
  // "散田" store is under fussa-coating.com but no scraped entry exists
  // (hachioji-sanda -> no match, intentionally left out)
};

/**
 * Strip common prefixes/suffixes from scraped store names for comparison.
 */
function normalizeScrapedName(name: string): string {
  return name
    .replace(/^(キーパー|コーティングステーション)/, '')
    .replace(/店$/, '')
    .trim();
}

/**
 * Strip common suffixes from our store name for comparison.
 */
function normalizeStoreName(name: string): string {
  return name.replace(/店$/, '').trim();
}

/**
 * Match a store entry to scraped data.
 *
 * Strategy:
 * 1. Check manual override map
 * 2. Look up the domain from the store URL in scrapedData
 * 3. Among that domain's stores, find the best match by name comparison:
 *    a) Exact match on storeName
 *    b) Scraped name includes our storeName (handles "キーパー" prefix)
 *    c) Normalized partial match (strip prefix/suffix)
 *    d) ssName matching
 *    e) storeId keyword matching against scraped name
 */
function findScrapedStore(store: StoreEntry): ScrapedStore | null {
  const domain = extractDomain(store.url);
  const domainData = scrapedData[domain];

  if (!domainData || !domainData.stores || domainData.stores.length === 0) {
    return null;
  }

  const scrapedStores = domainData.stores;

  // If only one store on the domain, return it directly
  if (scrapedStores.length === 1) {
    return scrapedStores[0];
  }

  // Check manual override
  const override = MANUAL_MATCH_OVERRIDES[store.storeId];
  if (override) {
    const overrideMatch = scrapedStores.find(s => s.storeName.includes(override));
    if (overrideMatch) return overrideMatch;
  }

  // Try exact match first
  const exactMatch = scrapedStores.find(s => s.storeName === store.storeName);
  if (exactMatch) return exactMatch;

  // Try: scraped storeName contains our storeName (handles prefix like "キーパー")
  const containsMatch = scrapedStores.find(s =>
    s.storeName.includes(store.storeName) || store.storeName.includes(s.storeName)
  );
  if (containsMatch) return containsMatch;

  // Try normalized partial match
  const cleanName = normalizeStoreName(store.storeName);
  const partialMatch = scrapedStores.find(s => {
    const scrapedClean = normalizeScrapedName(s.storeName);
    return scrapedClean.includes(cleanName) || cleanName.includes(scrapedClean);
  });
  if (partialMatch) return partialMatch;

  // Try ssName matching against normalized scraped names
  const ssMatch = scrapedStores.find(s => {
    const scrapedClean = normalizeScrapedName(s.storeName);
    return scrapedClean.includes(store.ssName) || store.ssName.includes(scrapedClean);
  });
  if (ssMatch) return ssMatch;

  // Try matching on the storeId parts (e.g. "nagoya-meito" -> check for "名東" in address)
  // Also try area-based address matching
  const areaMatch = scrapedStores.find(s => {
    const addr = s.address || '';
    return addr.includes(store.area) || store.storeName.includes(s.storeName.slice(0, 3));
  });
  if (areaMatch) return areaMatch;

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== KeePer Coating Store Seed Script ===\n');

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
  const storeToSubCompany = buildStoreToSubCompanyMap(storeData.subCompanies);

  const allStores = storeData.stores;
  const allSubCompanies = storeData.subCompanies;

  console.log(`Stores to seed:        ${allStores.length}`);
  console.log(`Sub-companies to seed: ${allSubCompanies.length}\n`);

  // ── Build all store documents ──────────────────────────────────────────

  let matchedCount = 0;
  let unmatchedCount = 0;
  const unmatchedStores: string[] = [];

  const storeDocs: { id: string; data: Record<string, unknown> }[] = [];

  for (const store of allStores) {
    const scraped = findScrapedStore(store);
    const subCompanySlug = storeToSubCompany.get(store.storeId) || '';
    const discountRate = computeDiscountRate(store.discounts);

    if (scraped) {
      matchedCount++;
    } else {
      unmatchedCount++;
      unmatchedStores.push(`  #${store.no} ${store.storeId} (${store.storeName}) -> ${extractDomain(store.url)}`);
    }

    const address = scraped?.address || '';
    const prefecture = extractPrefecture(address);
    const city = extractCity(address);

    const storeDoc: Record<string, unknown> = {
      // Identity
      store_id: store.storeId,
      store_name: store.storeName,
      is_active: true,

      // Contact
      address: address,
      postal_code: cleanPostalCode(scraped?.postalCode || null),
      prefecture: prefecture,
      city: city,
      tel: scraped?.phone || '',
      business_hours: scraped?.businessHours || '9:00〜18:00',
      regular_holiday: scraped?.holidays || '年中無休',
      email: '',
      line_url: '',

      // Location
      lat: scraped?.coordinates?.lat || 0,
      lng: scraped?.coordinates?.lng || 0,
      parking_spaces: 0,
      landmark: '',
      nearby_stations: JSON.stringify(
        (scraped?.access || []).slice(0, 3).map(a => ({ name: a, time: '' }))
      ),
      access_map_url: '',

      // Campaign
      campaign_title: '',
      campaign_deadline: '',
      discount_rate: discountRate,
      campaign_color_code: '#001AFF',

      // Custom text
      hero_title: '',
      hero_subtitle: '',
      description: '',
      meta_description: '',
      seo_keywords: '',

      // Images
      hero_image_url: '',
      logo_url: '',
      staff_photo_url: '',
      store_exterior_url: '',
      store_interior_url: '',
      before_after_url: '',
      campaign_banner_url: '',
      gallery_images: '[]',

      // Services & pricing
      custom_services: '[]',
      price_multiplier: 1.0,
      min_price_limit: 0,

      // Capabilities
      has_booth: false,
      level1_staff_count: 0,
      level2_staff_count: 0,
      google_place_id: '',

      // CMS
      sub_company_id: subCompanySlug,
      store_slug: deriveStoreSlug(store.storeId),
    };

    storeDocs.push({ id: store.storeId, data: storeDoc });
  }

  // ── Build all sub-company documents ────────────────────────────────────

  const subCompanyDocs: { id: string; data: Record<string, unknown> }[] = [];

  for (const sc of allSubCompanies) {
    subCompanyDocs.push({
      id: sc.slug,
      data: {
        id: sc.slug,
        name: sc.name,
        slug: sc.slug,
        stores: sc.storeIds,
        logo_url: '',
        description: '',
        url: sc.url,
      },
    });
  }

  // ── Write to Firestore in batches (max 500 operations per batch) ───────

  const BATCH_LIMIT = 500;

  // Combine all writes: stores + sub-companies
  const allWrites: { collection: string; id: string; data: Record<string, unknown> }[] = [
    ...storeDocs.map(d => ({ collection: 'stores', id: d.id, data: d.data })),
    ...subCompanyDocs.map(d => ({ collection: 'sub_companies', id: d.id, data: d.data })),
  ];

  console.log(`Total Firestore writes: ${allWrites.length}`);
  console.log(`  - ${storeDocs.length} stores`);
  console.log(`  - ${subCompanyDocs.length} sub-companies\n`);

  const batchCount = Math.ceil(allWrites.length / BATCH_LIMIT);
  console.log(`Executing ${batchCount} batch(es)...\n`);

  for (let i = 0; i < allWrites.length; i += BATCH_LIMIT) {
    const chunk = allWrites.slice(i, i + BATCH_LIMIT);
    const batch: WriteBatch = db.batch();

    for (const write of chunk) {
      const ref = db.collection(write.collection).doc(write.id);
      batch.set(ref, write.data, { merge: true });
    }

    const batchNum = Math.floor(i / BATCH_LIMIT) + 1;
    await batch.commit();
    console.log(`  Batch ${batchNum}/${batchCount}: committed ${chunk.length} writes`);
  }

  // ── Report ─────────────────────────────────────────────────────────────

  console.log('\n=== Seed Complete ===\n');
  console.log(`Stores seeded:         ${storeDocs.length}`);
  console.log(`Sub-companies seeded:  ${subCompanyDocs.length}`);
  console.log(`Scraped data matched:  ${matchedCount}/${allStores.length}`);
  console.log(`Stores without match:  ${unmatchedCount}`);

  if (unmatchedStores.length > 0) {
    console.log('\nUnmatched stores (using defaults):');
    for (const line of unmatchedStores) {
      console.log(line);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
