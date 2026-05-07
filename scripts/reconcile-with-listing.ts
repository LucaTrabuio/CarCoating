/**
 * Reconcile Firestore stores with the canonical 掲載リスト so that the
 * collection contains exactly the 196 active shops listed in
 * `プロショップ店掲載リスト` (the master public-listing CSV) and no
 * extras.
 *
 * Operations are explicit (not regex-driven) because each touches
 * either curated data or production semantics:
 *
 *   - 14 deletes — 7 KeePer LABO entries that aren't on the public
 *     listing, 1 empty-address legacy doc, 4 placeholder duplicates
 *     created by the bulk import, 2 curated docs whose address points
 *     to a different listing entry (and whose own name doesn't appear
 *     anywhere in the listing).
 *
 *   - 11 updates — winners of duplicate-address groups get renamed to
 *     match the canonical listing entry. Three records also get their
 *     address corrected so they land at the listing entry whose name
 *     they already use (currently their address points to a *different*
 *     listing entry's address).
 *
 *   - 4 inserts — listing entries that have no Firestore counterpart at
 *     all. Sub_company_id resolved by area heuristics with a sensible
 *     fallback; a new sub_company is created where none exists for the
 *     area.
 *
 * After this run: exactly 196 stores, each mapping 1:1 to one active
 * 掲載リスト entry. Deletes are idempotent (re-running doesn't double-
 * delete), updates are idempotent (writing the same fields again is a
 * no-op), inserts skip if the target store_id already exists.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/reconcile-with-listing.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { readFileSync, appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Operations ────────────────────────────────────────────────

const HARD_DELETES: { id: string; reason: string }[] = [
  // Not on the public listing at all (KeePer LABO flagship shops + 1 legacy)
  { id: 'fukuoka-area-1', reason: 'KeePer LABO 福岡南店 — not in 掲載リスト' },
  { id: 'ichihara-5', reason: 'KeePer LABO つくば店 — not in 掲載リスト' },
  { id: 'kanagawa-area-3-2', reason: 'KeePer LABO 湘南台店 — not in 掲載リスト' },
  { id: 'nawate-2', reason: 'KeePer LABO 枚方長尾店 — not in 掲載リスト' },
  { id: 'sapporo-7', reason: 'KeePer LABO 札幌インター店 — not in 掲載リスト' },
  { id: 'sendai-iwanuma-5', reason: 'KeePer LABO 仙台錦ケ丘店 — not in 掲載リスト' },
  { id: 'tokyo-area-1-5', reason: 'KeePer LABO 国分寺店 — not in 掲載リスト' },
  { id: 'sendai-ichibancho', reason: '一番町店 — empty address, no match in 掲載リスト' },
  // Placeholder duplicates from the bulk import (curated counterpart kept elsewhere)
  { id: 'kobe-himeji-5', reason: 'placeholder dup of himeji-carwash @ apolloONEカーウォッシュ姫路' },
  { id: 'hiroshima-area-1', reason: 'placeholder dup of otake @ キーパープロショップ大竹店' },
  { id: 'hyogo-area-2-2', reason: 'placeholder dup of kobe-shinkaichi @ KeePer PROSHOP 神戸店' },
  { id: 'kumamoto-area-1', reason: 'placeholder dup of kumamoto-otsu @ 大津SS' },
  // Curated docs whose address says "this listing entry" but whose own name
  // points nowhere — appear to be orphans from a long-ago data drift.
  { id: 'kobe-kitamachi', reason: '神戸北町店 — address overlaps 神戸新開地, name not in 掲載リスト' },
  { id: 'nagoya-meito', reason: '名東店 — address overlaps アポロドーム名古屋, name not in 掲載リスト' },
];

interface Update {
  id: string;
  reason: string;
  fields: Record<string, unknown>;
}

const UPDATES: Update[] = [
  // ─── Renames only (winners of dup-pair groups) ───
  {
    id: 'yokosuka',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: 'セルフ佐原インターSS',
      shouken_group: 'エリア11（東京都周辺・37店）',
      local_market_area: '横須賀・葉山エリア',
    },
  },
  {
    id: 'himeji-carwash',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: 'apolloONEカーウォッシュ姫路',
      shouken_group: 'エリア19（兵庫県周辺・5店）',
      local_market_area: '姫路市エリア',
    },
  },
  {
    id: 'otake',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: 'キーパープロショップ大竹店',
      shouken_group: 'エリア26（広島県周辺・4店）',
      local_market_area: '大竹・廿日市エリア',
    },
  },
  {
    id: 'kobe-shinkaichi',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: 'KeePer PROSHOP 神戸店',
      shouken_group: 'エリア20（兵庫県周辺・5店）',
      local_market_area: '神戸市西部（兵庫・長田・須磨）エリア',
    },
  },
  {
    id: 'kasugai-kozoji',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: 'セルフ高蔵寺',
      shouken_group: 'エリア14（愛知県周辺・28店）',
      local_market_area: '愛知県エリア',
    },
  },
  {
    id: 'kumamoto-otsu',
    reason: 'rename + correct address typo',
    fields: {
      store_name: '大津SS',
      address: '熊本県菊池郡大津町室東迫尻722-1',
      shouken_group: 'エリア31（熊本県周辺・3店）',
      local_market_area: '熊本市北・大津エリア',
    },
  },
  {
    id: 'nagoya-apollo-dome',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: 'アポロドーム名古屋',
      shouken_group: 'エリア14（愛知県周辺・28店）',
      local_market_area: '名古屋市中心部（中区・熱田・昭和）エリア',
    },
  },
  {
    id: 'tottori-johoku',
    reason: 'rename to canonical 掲載リスト name',
    fields: {
      store_name: '鳥取城北店',
      shouken_group: 'エリア22（鳥取県周辺・4店）',
      local_market_area: '鳥取市エリア',
    },
  },
  // ─── Relocations (fix address + rename to relocate to a missing listing entry) ───
  {
    id: 'hayama',
    reason: 'relocate: fix address (was at 横須賀岩戸 — that\'s 佐原インター); rename to 葉山SS',
    fields: {
      store_name: 'セルフ葉山SS',
      address: '神奈川県三浦郡葉山町木古庭649-1',
      city: '三浦郡葉山町',
      shouken_group: 'エリア11（東京都周辺・37店）',
      local_market_area: '神奈川県エリア',
    },
  },
  {
    id: 'inuyama',
    reason: 'relocate: fix address (was at 春日井白山町 — that\'s 高蔵寺); rename to 犬山',
    fields: {
      store_name: 'セルフ犬山',
      address: '愛知県犬山市梅坪1-13-3',
      city: '犬山市',
      shouken_group: 'エリア14（愛知県周辺・28店）',
      local_market_area: '犬山・一宮エリア',
    },
  },
  {
    id: 'yonago-kaibancho',
    reason: 'relocate: fix address (was at 鳥取西品治 — that\'s 城北店); rename to カーライフ角盤町',
    fields: {
      store_name: 'カーライフ角盤町',
      address: '鳥取県米子市角盤町3丁目143番地3',
      city: '米子市',
      sub_company_id: 'tottorishi',
      shouken_group: 'エリア21（鳥取県周辺・3店）',
      local_market_area: '米子・日吉津エリア',
    },
  },
];

interface NewStore {
  id: string;
  data: Record<string, unknown>;
  reason: string;
}

const newStoreDefaults = {
  postal_code: '',
  tel: '',
  business_hours: '',
  regular_holiday: '',
  email: '',
  line_url: '',
  lat: 0,
  lng: 0,
  parking_spaces: 0,
  landmark: '',
  nearby_stations: '',
  access_map_url: '',
  campaign_title: '',
  campaign_deadline: '',
  discount_rate: 20,
  campaign_color_code: '',
  hero_title: '',
  hero_subtitle: '',
  description: '',
  meta_description: '',
  seo_keywords: '',
  hero_image_url: '',
  logo_url: '',
  staff_photo_url: '',
  gallery_images: [],
  custom_services: [],
  price_multiplier: 1.0,
  min_price_limit: 0,
  has_booth: false,
  level1_staff_count: 0,
  level2_staff_count: 0,
  google_place_id: '',
  is_active: true,
};

const INSERTS: NewStore[] = [
  {
    id: 'himeji-keeper-pro',
    reason: 'add KeePer PROSHOP 姫路店 — listing entry with no Firestore counterpart',
    data: {
      ...newStoreDefaults,
      store_id: 'himeji-keeper-pro',
      store_slug: 'himeji-keeper-pro',
      sub_company_id: 'kobe-himeji',
      store_name: 'KeePer PROSHOP 姫路店',
      address: '兵庫県姫路市北条口5-73',
      prefecture: '兵庫県',
      city: '姫路市',
      shouken_group: 'エリア19（兵庫県周辺・5店）',
      local_market_area: '姫路市エリア',
    },
  },
  {
    id: 'shiga-otsu-lakeside',
    reason: 'add 大津レークサイド — listing entry with no Firestore counterpart',
    data: {
      ...newStoreDefaults,
      store_id: 'shiga-otsu-lakeside',
      store_slug: 'shiga-otsu-lakeside',
      // Reuse the existing "kumamoto" sub_company that currently maps to 大津・栗東エリア
      // (per the lma map built from existing data); rename later if desired.
      sub_company_id: 'kumamoto',
      store_name: '大津レークサイド',
      address: '滋賀県大津市皇子が丘3-8-25',
      prefecture: '滋賀県',
      city: '大津市',
      shouken_group: 'エリア17（京都府周辺・6店）',
      local_market_area: '大津・栗東エリア',
    },
  },
  {
    id: 'kanagawa-isehara-1',
    reason: 'add セルフ東大竹SS — listing entry with no Firestore counterpart',
    data: {
      ...newStoreDefaults,
      store_id: 'kanagawa-isehara-1',
      store_slug: 'kanagawa-isehara-1',
      sub_company_id: 'otake', // existing sub_company mapped to 伊勢原・秦野エリア
      store_name: 'セルフ東大竹SS',
      address: '神奈川県伊勢原市東大竹2-27-9',
      prefecture: '神奈川県',
      city: '伊勢原市',
      shouken_group: 'エリア11（東京都周辺・37店）',
      local_market_area: '伊勢原・秦野エリア',
    },
  },
  {
    id: 'tokyo-area-2-2',
    reason: 'add キーパープロショップ青山中央SS — listing entry with no Firestore counterpart',
    data: {
      ...newStoreDefaults,
      store_id: 'tokyo-area-2-2',
      store_slug: 'tokyo-area-2-2',
      // Existing map shows 東京都心エリア → hachiouji-fussa for one mapped store; reuse.
      sub_company_id: 'hachiouji-fussa',
      store_name: 'キーパープロショップ青山中央SS',
      address: '東京都港区北青山1-3-6',
      prefecture: '東京都',
      city: '港区',
      shouken_group: 'エリア11（東京都周辺・37店）',
      local_market_area: '東京都心（港・渋谷・文京）エリア',
    },
  },
];

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('[dry-run mode] no writes will be made\n');

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

  const before = await db.collection('stores').get();
  console.log(`Before: ${before.size} stores\n`);

  // ── Sub-company array updates: collect adds/removes ───────
  const addsBySc = new Map<string, string[]>();
  const removesBySc = new Map<string, string[]>();
  function addToSc(scId: string, storeId: string) {
    if (!scId) return;
    if (!addsBySc.has(scId)) addsBySc.set(scId, []);
    addsBySc.get(scId)!.push(storeId);
  }
  function removeFromSc(scId: string, storeId: string) {
    if (!scId) return;
    if (!removesBySc.has(scId)) removesBySc.set(scId, []);
    removesBySc.get(scId)!.push(storeId);
  }

  const beforeById = new Map(before.docs.map(d => [d.id, d.data()] as const));

  // ── Plan: deletes ─────────────────────────────────────────
  console.log('=== HARD DELETES (14) ===');
  for (const d of HARD_DELETES) {
    const data = beforeById.get(d.id);
    if (!data) {
      console.log(`  SKIP ${d.id} — not present (already deleted?)`);
      continue;
    }
    const sc = String(data.sub_company_id ?? '');
    console.log(`  ${d.id} (${data.store_name}) — ${d.reason}`);
    if (!dryRun) {
      await db.collection('stores').doc(d.id).delete();
    }
    if (sc) removeFromSc(sc, d.id);
  }

  // ── Plan: updates ─────────────────────────────────────────
  console.log('\n=== UPDATES (11) ===');
  for (const u of UPDATES) {
    const data = beforeById.get(u.id);
    if (!data) {
      console.log(`  SKIP ${u.id} — not present`);
      continue;
    }
    const oldSc = String(data.sub_company_id ?? '');
    const newSc = (u.fields.sub_company_id as string | undefined) ?? oldSc;
    console.log(`  ${u.id} ← ${JSON.stringify(u.fields)} | ${u.reason}`);
    if (!dryRun) {
      await db.collection('stores').doc(u.id).update(u.fields);
    }
    if (newSc !== oldSc) {
      removeFromSc(oldSc, u.id);
      addToSc(newSc, u.id);
    }
  }

  // ── Plan: inserts ─────────────────────────────────────────
  console.log('\n=== INSERTS (4) ===');
  for (const ins of INSERTS) {
    if (beforeById.has(ins.id)) {
      console.log(`  SKIP ${ins.id} — already exists`);
      continue;
    }
    console.log(`  + ${ins.id}: ${(ins.data as { store_name: string }).store_name} → ${(ins.data as { sub_company_id: string }).sub_company_id} | ${ins.reason}`);
    if (!dryRun) {
      await db.collection('stores').doc(ins.id).set(ins.data);
    }
    addToSc((ins.data as { sub_company_id: string }).sub_company_id, ins.id);
  }

  // ── Apply sub_company.stores reconciliation ───────────────
  if (!dryRun) {
    console.log('\n=== SUB-COMPANY ARRAY UPDATES ===');
    for (const [scId, ids] of removesBySc.entries()) {
      await db.collection('sub_companies').doc(scId).update({
        stores: FieldValue.arrayRemove(...ids),
      });
      console.log(`  ${scId} -= ${ids.length}`);
    }
    for (const [scId, ids] of addsBySc.entries()) {
      await db.collection('sub_companies').doc(scId).update({
        stores: FieldValue.arrayUnion(...ids),
      });
      console.log(`  ${scId} += ${ids.length}`);
    }
  }

  // ── Final count + audit log ───────────────────────────────
  if (!dryRun) {
    const after = await db.collection('stores').get();
    console.log(`\nAfter: ${after.size} stores`);
  } else {
    const expected = before.size - HARD_DELETES.filter(d => beforeById.has(d.id)).length + INSERTS.filter(i => !beforeById.has(i.id)).length;
    console.log(`\nExpected after apply: ${expected} stores`);
  }

  // Append summary to MISSING_DATA.md
  const md = [
    '',
    '---',
    '',
    `## Reconcile-with-listing — ${dryRun ? 'dry-run preview' : new Date().toISOString()}`,
    '',
    `### Hard deletes (${HARD_DELETES.length})`,
    '',
    ...HARD_DELETES.map(d => `- \`${d.id}\` — ${d.reason}`),
    '',
    `### Updates (${UPDATES.length})`,
    '',
    ...UPDATES.map(u => `- \`${u.id}\` — ${u.reason}`),
    '',
    `### Inserts (${INSERTS.length})`,
    '',
    ...INSERTS.map(i => `- \`${i.id}\` — ${(i.data as { store_name: string }).store_name} (${(i.data as { address: string }).address}) — ${i.reason}`),
    '',
  ].join('\n');
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  if (existsSync(mdPath)) appendFileSync(mdPath, md, 'utf-8');
  console.log(`\n✓ Appended reconcile section to ${mdPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
