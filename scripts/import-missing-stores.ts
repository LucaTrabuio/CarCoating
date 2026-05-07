/**
 * Import the 113 master-CSV shops that don't yet exist in Firestore.
 *
 * Strategy:
 *   1. Re-run the same address + normalised-name matcher from
 *      seed-area-data.ts to identify which CSV rows are truly unmatched.
 *   2. For each unmatched row:
 *        a. Resolve sub_company_id by looking up the row's
 *           ローカルマーケエリア against existing Firestore stores'
 *           sub_company_id. Pick the most common one already in use
 *           for that area. If none, create a new sub_company doc.
 *        b. Generate store_id / store_slug as <sub_company.id>-<n>,
 *           starting from N+1 where N is the count of existing
 *           stores with that sub_company_id (existing + already-
 *           processed-in-this-run).
 *        c. Build a V3StoreData record with: store_name = SS名,
 *           address = 住所 (parsed for city), prefecture from CSV,
 *           shouken_group + local_market_area from CSV, sub_company_id,
 *           is_active = true, all other fields = sensible defaults.
 *   3. On apply: write each new store doc, write any new sub_company
 *      doc, then update each sub_company.stores array to include the
 *      new store ids.
 *   4. Append a "## New stores imported" section to MISSING_DATA.md.
 *
 * Idempotent: skips any CSV row whose generated ID already exists.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/import-missing-stores.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { resolve } from 'path';

// ─── CSV path ────────────────────────────────────────────────

const CSV_PATH =
  '/Users/lucatrabuio/Downloads/proshop_groups_v2（修正済） CSV/商圏グループ別-Table 1.csv';

// ─── Reuse the same parser + normalisers from seed-area-data ──

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

function normaliseAddress(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/[ー－―−‐]/g, '-')
    .replace(/[、,]/g, '')
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/丁目/g, '-').replace(/番地/g, '-').replace(/番/g, '-').replace(/号/g, '')
    .toLowerCase();
}

const PREFIX_TOKENS = [
  'スマートエコステーション', 'スマートエコス', 'コーティングステーション',
  'KeePerプロショップ', 'キーパープロショップ', 'キパープロショップ',
  'KeePer PROSHOP', 'KeePerPROSHOP', 'KeePer PRO SHOP', 'KeePer LABO',
  'apolloONEカーウォッシュ', 'カーライフサポート', 'カーライフフロンティア',
  'カーライフ', 'パートナー', 'メンテセルフ', 'セルフステーション',
  'セルフリバーサイド', 'セルフスマイル', 'セルフプラザ', 'セルフ',
  'カードック', 'シーサイド', 'アポロドーム', 'カーフル', 'ジョイフル', 'ポルタス',
];
const SUFFIX_TOKENS = ['サービスステーション', 'サービスショップ', '営業所', '給油所', 'SS', '店'];

function normaliseStoreName(raw: string): string {
  let s = raw.replace(/\s+/g, '').replace(/　/g, '');
  const prefixes = [...PREFIX_TOKENS].sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (s.toLowerCase().startsWith(p.toLowerCase())) { s = s.slice(p.length); break; }
  }
  const suffixes = [...SUFFIX_TOKENS].sort((a, b) => b.length - a.length);
  for (const sfx of suffixes) {
    if (s.endsWith(sfx)) { s = s.slice(0, -sfx.length); break; }
  }
  return s.toLowerCase();
}

// Prefecture → ASCII slug for fallback sub_company id generation
const PREF_SLUGS: Record<string, string> = {
  北海道: 'hokkaido', 青森県: 'aomori', 岩手県: 'iwate', 宮城県: 'miyagi',
  秋田県: 'akita', 山形県: 'yamagata', 福島県: 'fukushima',
  茨城県: 'ibaraki', 栃木県: 'tochigi', 群馬県: 'gunma', 埼玉県: 'saitama',
  千葉県: 'chiba', 東京都: 'tokyo', 神奈川県: 'kanagawa',
  新潟県: 'niigata', 富山県: 'toyama', 石川県: 'ishikawa', 福井県: 'fukui',
  山梨県: 'yamanashi', 長野県: 'nagano',
  岐阜県: 'gifu', 静岡県: 'shizuoka', 愛知県: 'aichi', 三重県: 'mie',
  滋賀県: 'shiga', 京都府: 'kyoto', 大阪府: 'osaka', 兵庫県: 'hyogo',
  奈良県: 'nara', 和歌山県: 'wakayama',
  鳥取県: 'tottori', 島根県: 'shimane', 岡山県: 'okayama', 広島県: 'hiroshima',
  山口県: 'yamaguchi',
  徳島県: 'tokushima', 香川県: 'kagawa', 愛媛県: 'ehime', 高知県: 'kochi',
  福岡県: 'fukuoka', 佐賀県: 'saga', 長崎県: 'nagasaki', 熊本県: 'kumamoto',
  大分県: 'oita', 宮崎県: 'miyazaki', 鹿児島県: 'kagoshima', 沖縄県: 'okinawa',
};

function parsePrefectureFromAddress(address: string): string | null {
  for (const pref of Object.keys(PREF_SLUGS)) {
    if (address.startsWith(pref)) return pref;
  }
  return null;
}

function parseCityFromAddress(address: string, prefecture: string): string {
  const tail = address.slice(prefecture.length);
  // Pull up to first 区 / 市 / 郡 marker
  const m = tail.match(/^([^市区郡町村]*[市区郡町村])/);
  return m ? m[1] : '';
}

// ─── Main ─────────────────────────────────────────────────────

interface FsStore {
  id: string;
  name: string;
  nameNorm: string;
  address: string;
  addressNorm: string;
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
}

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

  // ── Load CSV ──────────────────────────────────────────────
  const raw = readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const findCol = (...needles: string[]) => {
    for (const n of needles) { const i = headers.indexOf(n); if (i >= 0) return i; }
    for (const n of needles) { const i = headers.findIndex(h => h.includes(n)); if (i >= 0) return i; }
    return -1;
  };
  const idx = {
    name: findCol('SS名'), group: findCol('商圏グループ'),
    area: findCol('ローカルマーケエリア'), address: findCol('住所'),
    pref: findCol('都道府県'),
  };
  for (const [k, v] of Object.entries(idx)) {
    if (v < 0) throw new Error(`Missing column: ${k}`);
  }

  interface CsvRow {
    name: string; group: string; area: string;
    prefecture: string; address: string;
    addressNorm: string; nameNorm: string;
  }
  const csvRows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = (cols[idx.name] ?? '').trim();
    if (!name) continue;
    const address = (cols[idx.address] ?? '').trim();
    csvRows.push({
      name, group: (cols[idx.group] ?? '').trim(),
      area: (cols[idx.area] ?? '').trim(),
      prefecture: (cols[idx.pref] ?? '').trim(),
      address,
      addressNorm: normaliseAddress(address),
      nameNorm: normaliseStoreName(name),
    });
  }

  // ── Load existing stores + sub_companies ─────────────────
  const storeSnap = await db.collection('stores').get();
  const allStores: FsStore[] = storeSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.store_name ?? ''),
      nameNorm: normaliseStoreName(String(data.store_name ?? '')),
      address: String(data.address ?? ''),
      addressNorm: normaliseAddress(String(data.address ?? '')),
      ref: d.ref,
      data,
    };
  });
  const subCoSnap = await db.collection('sub_companies').get();
  const subCos = subCoSnap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));
  console.log(`CSV: ${csvRows.length} rows  |  Firestore stores: ${allStores.length}  |  sub_companies: ${subCos.length}`);

  // ── Re-run matcher to find truly-unmatched CSV rows ───────
  const byAddressNorm = new Map<string, FsStore>();
  const byExactName = new Map<string, FsStore>();
  for (const s of allStores) {
    if (s.addressNorm) byAddressNorm.set(s.addressNorm, s);
    if (s.name) byExactName.set(s.name, s);
  }
  const usedFsIds = new Set<string>();
  function tryMatch(row: CsvRow): FsStore | null {
    if (row.addressNorm) {
      const hit = byAddressNorm.get(row.addressNorm);
      if (hit && !usedFsIds.has(hit.id)) return hit;
    }
    const exact = byExactName.get(row.name);
    if (exact && !usedFsIds.has(exact.id)) return exact;
    if (row.nameNorm) {
      const subs: FsStore[] = [];
      for (const s of allStores) {
        if (usedFsIds.has(s.id) || !s.nameNorm) continue;
        if (
          (row.nameNorm.length >= 2 && s.nameNorm.includes(row.nameNorm)) ||
          (s.nameNorm.length >= 2 && row.nameNorm.includes(s.nameNorm))
        ) subs.push(s);
      }
      if (subs.length === 1) return subs[0];
    }
    return null;
  }
  const unmatched: CsvRow[] = [];
  for (const row of csvRows) {
    const m = tryMatch(row);
    if (m) usedFsIds.add(m.id);
    else unmatched.push(row);
  }
  console.log(`Unmatched CSV rows (= candidates to import): ${unmatched.length}\n`);

  // ── Build local_market_area → existing sub_company_id map ──
  const lmaToScCount = new Map<string, Map<string, number>>();
  for (const s of allStores) {
    const lma = String(s.data.local_market_area ?? '');
    const sc = String(s.data.sub_company_id ?? '');
    if (!lma || !sc) continue;
    if (!lmaToScCount.has(lma)) lmaToScCount.set(lma, new Map());
    const m = lmaToScCount.get(lma)!;
    m.set(sc, (m.get(sc) ?? 0) + 1);
  }
  // Most-common sub_company per area
  const lmaToSc = new Map<string, string>();
  for (const [lma, counts] of lmaToScCount.entries()) {
    let best: [string, number] | null = null;
    for (const [sc, n] of counts.entries()) {
      if (!best || n > best[1]) best = [sc, n];
    }
    if (best) lmaToSc.set(lma, best[0]);
  }

  // ── Reserve store_ids per sub_company_id ─────────────────
  const usedStoreIds = new Set(allStores.map(s => s.id));
  const subCoCounters = new Map<string, number>();
  for (const s of allStores) {
    const sc = String(s.data.sub_company_id ?? '');
    if (!sc) continue;
    subCoCounters.set(sc, (subCoCounters.get(sc) ?? 0) + 1);
  }
  function nextStoreId(scId: string): string {
    let n = (subCoCounters.get(scId) ?? 0) + 1;
    let candidate = n === 1 && !usedStoreIds.has(scId) ? scId : `${scId}-${n}`;
    while (usedStoreIds.has(candidate)) {
      n++;
      candidate = `${scId}-${n}`;
    }
    subCoCounters.set(scId, n);
    usedStoreIds.add(candidate);
    return candidate;
  }

  // ── Create-on-demand sub_companies for unmapped areas ─────
  const usedScIds = new Set(subCos.map(s => s.id));
  const newSubCos: { id: string; data: Record<string, unknown> }[] = [];
  function ensureSubCompanyForArea(lma: string, prefecture: string): string {
    const existing = lmaToSc.get(lma);
    if (existing) return existing;
    // Create new — slug from prefecture + a sequential index
    const prefSlug = PREF_SLUGS[prefecture] ?? 'misc';
    let n = 1;
    let candidate = `${prefSlug}-area-${n}`;
    while (usedScIds.has(candidate)) { n++; candidate = `${prefSlug}-area-${n}`; }
    usedScIds.add(candidate);
    const data = {
      id: candidate,
      slug: candidate,
      name: lma || `${prefecture}エリア`,
      description: '',
      url: '',
      logo_url: '',
      stores: [],
    };
    newSubCos.push({ id: candidate, data });
    lmaToSc.set(lma, candidate);
    return candidate;
  }

  // ── Build new store records ───────────────────────────────
  interface NewStore { csv: CsvRow; storeId: string; subCompanyId: string; data: Record<string, unknown>; }
  const toCreate: NewStore[] = [];
  for (const row of unmatched) {
    const pref = row.prefecture || parsePrefectureFromAddress(row.address) || '';
    const subCompanyId = ensureSubCompanyForArea(row.area, pref);
    const storeId = nextStoreId(subCompanyId);
    const city = pref ? parseCityFromAddress(row.address, pref) : '';
    const data = {
      store_id: storeId,
      store_name: row.name,
      store_slug: storeId,
      sub_company_id: subCompanyId,
      shouken_group: row.group,
      local_market_area: row.area,
      prefecture: pref,
      city,
      address: row.address,
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
    toCreate.push({ csv: row, storeId, subCompanyId, data });
  }

  // ── Preview ───────────────────────────────────────────────
  console.log(`To create: ${toCreate.length} stores, ${newSubCos.length} new sub_companies\n`);
  if (newSubCos.length > 0) {
    console.log('New sub_companies:');
    for (const sc of newSubCos) console.log(`  + ${sc.id}: "${(sc.data as { name: string }).name}"`);
    console.log();
  }
  console.log('First 10 store imports:');
  toCreate.slice(0, 10).forEach(t => console.log(`  + ${t.storeId} (${t.subCompanyId}): ${t.csv.name}`));
  if (toCreate.length > 10) console.log(`  … +${toCreate.length - 10} more`);

  // ── Apply ─────────────────────────────────────────────────
  if (!dryRun) {
    console.log('\nApplying writes…');

    for (const sc of newSubCos) {
      await db.collection('sub_companies').doc(sc.id).set(sc.data);
      console.log(`  ✓ sub_company ${sc.id}`);
    }
    for (const t of toCreate) {
      await db.collection('stores').doc(t.storeId).set(t.data);
    }
    // Update sub_company.stores arrays
    const storesPerSc = new Map<string, string[]>();
    for (const t of toCreate) {
      if (!storesPerSc.has(t.subCompanyId)) storesPerSc.set(t.subCompanyId, []);
      storesPerSc.get(t.subCompanyId)!.push(t.storeId);
    }
    for (const [scId, ids] of storesPerSc.entries()) {
      await db.collection('sub_companies').doc(scId).update({
        stores: FieldValue.arrayUnion(...ids),
      });
    }
    console.log(`  ✓ ${toCreate.length} stores written, ${storesPerSc.size} sub_companies updated`);
  }

  // ── Append to MISSING_DATA.md ─────────────────────────────
  const md = [
    '',
    '---',
    '',
    `## New stores imported (${toCreate.length}) — ${dryRun ? 'dry-run preview' : new Date().toISOString()}`,
    '',
    'IDs are auto-generated as `<sub_company_id>-<n>`. Rename later via Firestore if you want',
    'a more human-friendly slug. The `store_slug` field controls the public URL.',
    '',
    ...(newSubCos.length > 0
      ? [
          `### New sub_companies (${newSubCos.length})`,
          '',
          ...newSubCos.map(s => `- \`${s.id}\` — "${(s.data as { name: string }).name}"`),
          '',
        ]
      : []),
    '### New stores',
    '',
    '| store_id | sub_company_id | local_market_area | SS名 |',
    '|---|---|---|---|',
    ...toCreate.map(t =>
      `| \`${t.storeId}\` | \`${t.subCompanyId}\` | ${t.csv.area || '—'} | ${t.csv.name} |`,
    ),
    '',
  ].join('\n');

  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  if (existsSync(mdPath)) {
    appendFileSync(mdPath, md, 'utf-8');
    console.log(`\n✓ Appended new-import section to ${mdPath}`);
  } else {
    writeFileSync(mdPath, md, 'utf-8');
    console.log(`\n✓ Wrote ${mdPath}`);
  }

  console.log(`\nDone: would create ${toCreate.length} stores + ${newSubCos.length} sub_companies${dryRun ? ' (dry-run)' : ''}`);
}

main().catch(err => { console.error(err); process.exit(1); });
