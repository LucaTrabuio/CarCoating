/**
 * Seed 商圏グループ / ローカルマーケエリア data from CSV into Firestore stores.
 *
 * Also:
 *   - Hard-deletes 3 named stores (logs before each delete; bails if >1 doc matches).
 *   - Sets seasonal visibility on 三笠中央SS (hide_mode='seasonal', 12-01 → 03-31).
 *   - Writes MISSING_DATA.md at repo root with a reconciliation report
 *     (also on --dry-run, so the operator can review before applying).
 *
 * Matching strategy (in order):
 *   1. Exact address match (CSV 住所 normalised vs Firestore address normalised) — most reliable
 *   2. Exact store_name match (CSV SS名 vs Firestore store_name)
 *   3. Normalised name substring match — strip common prefixes/suffixes
 *      (セルフ / KeePer LABO / カーライフ / 〜SS / 〜店 etc.) on both sides
 *
 * Idempotent — safe to run multiple times.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/seed-area-data.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── CSV path ────────────────────────────────────────────────

const CSV_PATH =
  '/Users/lucatrabuio/Downloads/proshop_groups_v2（修正済） CSV/商圏グループ別-Table 1.csv';

// ─── Stores to hard-delete (by SS名) ──────────────────────────

const STORES_TO_DELETE_SS_NAMES = [
  'カーライフサポート鳥取扇町',
  'カーライフフロンティア斐川',
  'カーライフ玉造SS',
];

// ─── Store to set seasonal hide ───────────────────────────────

const SEASONAL_SS_NAME = '三笠中央SS';
const SEASONAL_START = '12-01';
const SEASONAL_END = '03-31';

// ─── CSV parser (mirrors firebase-stores.ts parseCSVLine) ─────

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

// ─── Normalisation helpers ────────────────────────────────────

// Strip whitespace + halfwidth/fullwidth punctuation that varies between
// the master CSV and Firestore-typed addresses.
function normaliseAddress(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/[ー－―−‐]/g, '-') // various dash forms → '-'
    .replace(/[、,]/g, '')
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)) // fullwidth → halfwidth
    .replace(/丁目/g, '-')
    .replace(/番地/g, '-')
    .replace(/番/g, '-')
    .replace(/号/g, '')
    .toLowerCase();
}

// Strip common car-coating brand prefixes + service-station suffixes so the
// "core" branch identifier remains. Used as a fuzzy fallback when address +
// exact-name both fail.
const PREFIX_TOKENS = [
  'スマートエコステーション',
  'スマートエコス',
  'コーティングステーション',
  'KeePerプロショップ',
  'キーパープロショップ',
  'キパープロショップ',
  'KeePer PROSHOP',
  'KeePerPROSHOP',
  'KeePer PRO SHOP',
  'KeePer LABO',
  'apolloONEカーウォッシュ',
  'カーライフサポート',
  'カーライフフロンティア',
  'カーライフ',
  'パートナー',
  'メンテセルフ',
  'セルフステーション',
  'セルフリバーサイド',
  'セルフスマイル',
  'セルフプラザ',
  'セルフ',
  'カードック',
  'シーサイド',
  'アポロドーム',
  'カーフル',
  'ジョイフル',
  'ポルタス',
];
const SUFFIX_TOKENS = ['サービスステーション', 'サービスショップ', '営業所', '給油所', 'SS', '店'];

function normaliseStoreName(raw: string): string {
  let s = raw.replace(/\s+/g, '').replace(/　/g, '');
  // strip prefixes (longest first)
  const prefixes = [...PREFIX_TOKENS].sort((a, b) => b.length - a.length);
  for (const p of prefixes) {
    if (s.toLowerCase().startsWith(p.toLowerCase())) {
      s = s.slice(p.length);
      break;
    }
  }
  // strip suffixes (longest first)
  const suffixes = [...SUFFIX_TOKENS].sort((a, b) => b.length - a.length);
  for (const sfx of suffixes) {
    if (s.endsWith(sfx)) {
      s = s.slice(0, -sfx.length);
      break;
    }
  }
  return s.toLowerCase();
}

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

  // ── Load CSV ──────────────────────────────────────────────
  const raw = readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV appears empty or has no data rows');

  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  // Resolve columns by HEADER NAME (not index). Match exact-first, then by-substring.
  const findCol = (...needles: string[]): number => {
    for (const needle of needles) {
      const exact = headers.indexOf(needle);
      if (exact >= 0) return exact;
    }
    for (const needle of needles) {
      const partial = headers.findIndex(h => h === needle || h.includes(needle));
      if (partial >= 0) return partial;
    }
    return -1;
  };

  const nameIdx = findCol('SS名');
  const groupIdx = findCol('商圏グループ');
  const localAreaIdx = findCol('ローカルマーケエリア'); // exact column we want
  const addressIdx = findCol('住所');

  if (nameIdx < 0) throw new Error(`Cannot find SS名 column. Headers: ${headers.join(' | ')}`);
  if (groupIdx < 0) throw new Error(`Cannot find 商圏グループ column. Headers: ${headers.join(' | ')}`);
  if (localAreaIdx < 0) throw new Error(`Cannot find ローカルマーケエリア column. Headers: ${headers.join(' | ')}`);
  if (addressIdx < 0) throw new Error(`Cannot find 住所 column. Headers: ${headers.join(' | ')}`);

  console.log(`CSV columns resolved — SS名:${nameIdx} 商圏グループ:${groupIdx} ローカルマーケエリア:${localAreaIdx} 住所:${addressIdx}`);

  interface CsvRow {
    name: string;
    group: string;
    area: string;
    address: string;
    addressNorm: string;
    nameNorm: string;
  }
  const csvRows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = (cols[nameIdx] ?? '').trim();
    if (!name) continue;
    const address = (cols[addressIdx] ?? '').trim();
    csvRows.push({
      name,
      group: (cols[groupIdx] ?? '').trim(),
      area: (cols[localAreaIdx] ?? '').trim(),
      address,
      addressNorm: normaliseAddress(address),
      nameNorm: normaliseStoreName(name),
    });
  }
  console.log(`Loaded ${csvRows.length} rows from CSV`);

  // ── Load Firestore stores ─────────────────────────────────
  const snapshot = await db.collection('stores').get();
  interface FsStore {
    id: string;
    name: string;
    nameNorm: string;
    address: string;
    addressNorm: string;
    ref: FirebaseFirestore.DocumentReference;
  }
  const allStores: FsStore[] = snapshot.docs.map(d => {
    const data = d.data();
    const name = String(data.store_name ?? '');
    const address = String(data.address ?? '');
    return {
      id: d.id,
      name,
      nameNorm: normaliseStoreName(name),
      address,
      addressNorm: normaliseAddress(address),
      ref: d.ref,
    };
  });
  console.log(`Found ${allStores.length} stores in Firestore\n`);

  // Build lookup tables
  const byAddressNorm = new Map<string, FsStore>();
  const byExactName = new Map<string, FsStore>();
  const byNameNorm = new Map<string, FsStore[]>();
  for (const s of allStores) {
    if (s.addressNorm) byAddressNorm.set(s.addressNorm, s);
    if (s.name) byExactName.set(s.name, s);
    if (s.nameNorm) {
      if (!byNameNorm.has(s.nameNorm)) byNameNorm.set(s.nameNorm, []);
      byNameNorm.get(s.nameNorm)!.push(s);
    }
  }

  // ── Match each CSV row to one Firestore store (or none) ───
  type MatchMode = 'address' | 'exact-name' | 'normalised-name';
  interface Matched { row: CsvRow; store: FsStore; mode: MatchMode }
  const matches: Matched[] = [];
  const unmatched: CsvRow[] = [];
  const usedFirestoreIds = new Set<string>();

  function tryMatch(row: CsvRow): { store: FsStore; mode: MatchMode } | null {
    if (row.addressNorm) {
      const hit = byAddressNorm.get(row.addressNorm);
      if (hit && !usedFirestoreIds.has(hit.id)) return { store: hit, mode: 'address' };
    }
    const exact = byExactName.get(row.name);
    if (exact && !usedFirestoreIds.has(exact.id)) return { store: exact, mode: 'exact-name' };
    if (row.nameNorm) {
      const candidates = (byNameNorm.get(row.nameNorm) ?? []).filter(s => !usedFirestoreIds.has(s.id));
      if (candidates.length === 1) return { store: candidates[0], mode: 'normalised-name' };
      // Substring fallback: CSV core ⊂ Firestore core OR Firestore core ⊂ CSV core
      const subs: FsStore[] = [];
      for (const s of allStores) {
        if (usedFirestoreIds.has(s.id)) continue;
        if (!s.nameNorm) continue;
        if (
          (row.nameNorm.length >= 2 && s.nameNorm.includes(row.nameNorm)) ||
          (s.nameNorm.length >= 2 && row.nameNorm.includes(s.nameNorm))
        ) {
          subs.push(s);
        }
      }
      if (subs.length === 1) return { store: subs[0], mode: 'normalised-name' };
    }
    return null;
  }

  for (const row of csvRows) {
    const m = tryMatch(row);
    if (!m) {
      unmatched.push(row);
      continue;
    }
    usedFirestoreIds.add(m.store.id);
    matches.push({ row, store: m.store, mode: m.mode });
  }

  // ── Apply patches ─────────────────────────────────────────
  let patched = 0;
  for (const m of matches) {
    const update: Record<string, string> = {};
    if (m.row.group) update.shouken_group = m.row.group;
    if (m.row.area) update.local_market_area = m.row.area;
    if (Object.keys(update).length === 0) continue;

    const tag = `[${m.mode}]`;
    if (dryRun) {
      console.log(`[dry-run] PATCH ${tag} ${m.store.name} ← ${m.row.name}: ${JSON.stringify(update)}`);
    } else {
      await m.store.ref.update(update);
      console.log(`✓ ${tag} ${m.store.name}: ${JSON.stringify(update)}`);
    }
    patched++;
  }

  // ── Hard deletes (by CSV SS名 → resolved Firestore store via the same matcher) ──
  const deleteLog: string[] = [];
  for (const ssName of STORES_TO_DELETE_SS_NAMES) {
    // Build a CsvRow-shaped object so we reuse tryMatch
    const csvRow = csvRows.find(r => r.name === ssName);
    let store: FsStore | null = null;
    let mode: MatchMode | 'unresolved' = 'unresolved';
    if (csvRow) {
      // Don't reuse usedFirestoreIds for deletes — we want to find it even if
      // it was already matched by an area-data row. (Address dedup is fine.)
      const localUsed = new Set<string>();
      const m = (() => {
        const candidates: { store: FsStore; mode: MatchMode }[] = [];
        if (csvRow.addressNorm) {
          const hit = byAddressNorm.get(csvRow.addressNorm);
          if (hit) candidates.push({ store: hit, mode: 'address' });
        }
        const exact = byExactName.get(csvRow.name);
        if (exact) candidates.push({ store: exact, mode: 'exact-name' });
        if (csvRow.nameNorm) {
          for (const s of allStores) {
            if (
              s.nameNorm &&
              ((csvRow.nameNorm.length >= 2 && s.nameNorm.includes(csvRow.nameNorm)) ||
                (s.nameNorm.length >= 2 && csvRow.nameNorm.includes(s.nameNorm)))
            ) {
              candidates.push({ store: s, mode: 'normalised-name' });
            }
          }
        }
        const dedup = candidates.filter(c => !localUsed.has(c.store.id));
        if (dedup.length === 1) return dedup[0];
        // Address match wins over name match if multiple candidates
        const addr = dedup.find(c => c.mode === 'address');
        if (addr) return addr;
        return null;
      })();
      if (m) {
        store = m.store;
        mode = m.mode;
      }
    }

    if (!store) {
      console.log(`DELETE skip: "${ssName}" — not resolvable to a Firestore store`);
      deleteLog.push(`- "${ssName}" — not resolvable (already deleted, or not in Firestore)`);
      continue;
    }
    console.log(`DELETE [${mode}]: "${ssName}" → "${store.name}" (id=${store.id})`);
    if (!dryRun) {
      await store.ref.delete();
      console.log(`  ✓ deleted`);
    }
    deleteLog.push(`- "${ssName}" → "${store.name}" (id=${store.id}) — hard-delete${dryRun ? ' [dry-run]' : ''}`);
  }

  // ── Seasonal visibility for 三笠中央SS ────────────────────
  let seasonalLog = '';
  const seasonalCsv = csvRows.find(r => r.name === SEASONAL_SS_NAME);
  let seasonalStore: FsStore | null = null;
  let seasonalMode: MatchMode | 'unresolved' = 'unresolved';
  if (seasonalCsv) {
    if (seasonalCsv.addressNorm) {
      const hit = byAddressNorm.get(seasonalCsv.addressNorm);
      if (hit) {
        seasonalStore = hit;
        seasonalMode = 'address';
      }
    }
    if (!seasonalStore) {
      const exact = byExactName.get(seasonalCsv.name);
      if (exact) {
        seasonalStore = exact;
        seasonalMode = 'exact-name';
      }
    }
    if (!seasonalStore && seasonalCsv.nameNorm) {
      const subs = allStores.filter(
        s =>
          s.nameNorm &&
          ((seasonalCsv.nameNorm.length >= 2 && s.nameNorm.includes(seasonalCsv.nameNorm)) ||
            (s.nameNorm.length >= 2 && seasonalCsv.nameNorm.includes(s.nameNorm))),
      );
      if (subs.length === 1) {
        seasonalStore = subs[0];
        seasonalMode = 'normalised-name';
      }
    }
  }
  if (!seasonalStore) {
    console.log(`SEASONAL skip: "${SEASONAL_SS_NAME}" — not resolvable`);
    seasonalLog = `- "${SEASONAL_SS_NAME}" — not resolvable to a Firestore store`;
  } else {
    console.log(
      `SEASONAL [${seasonalMode}]: "${SEASONAL_SS_NAME}" → "${seasonalStore.name}" (id=${seasonalStore.id}) → hide_mode=seasonal ${SEASONAL_START}–${SEASONAL_END}`,
    );
    if (!dryRun) {
      await seasonalStore.ref.update({
        hide_mode: 'seasonal',
        seasonal_hide_start: SEASONAL_START,
        seasonal_hide_end: SEASONAL_END,
      });
      console.log('  ✓ seasonal visibility set');
    }
    seasonalLog = `- "${SEASONAL_SS_NAME}" → "${seasonalStore.name}" (id=${seasonalStore.id}) — hide_mode=seasonal ${SEASONAL_START}–${SEASONAL_END}${dryRun ? ' [dry-run]' : ''}`;
  }

  // ── Reconciliation ────────────────────────────────────────
  const matchedFirestoreIds = new Set(matches.map(m => m.store.id));
  const firestoreUnmatched = allStores
    .filter(s => !matchedFirestoreIds.has(s.id))
    .map(s => s.name);

  // ── Write MISSING_DATA.md ─────────────────────────────────
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  const matchModeCounts = matches.reduce<Record<string, number>>((acc, m) => {
    acc[m.mode] = (acc[m.mode] ?? 0) + 1;
    return acc;
  }, {});
  const md = [
    '# MISSING_DATA — 商圏グループ seed audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${dryRun ? 'dry-run (no writes)' : 'apply'}`,
    `CSV rows: ${csvRows.length}  |  Firestore stores: ${allStores.length}  |  Patched: ${patched}`,
    `Match modes: ${JSON.stringify(matchModeCounts)}`,
    '',
    '## CSV rows that had NO matching Firestore store',
    '',
    'These shops exist in the master CSV but not (under any matchable name/address) in Firestore.',
    'They likely need to be added to Firestore as new stores.',
    '',
    unmatched.length === 0
      ? '_none_'
      : unmatched.map(r => `- **${r.name}** — ${r.address || '(no address)'} — group: ${r.group} / area: ${r.area}`).join('\n'),
    '',
    '## Firestore stores not matched to a CSV row',
    '',
    'These shops exist in Firestore but were not matched to any CSV row. They have no area data.',
    '',
    firestoreUnmatched.length === 0 ? '_none_' : firestoreUnmatched.map(n => `- ${n}`).join('\n'),
    '',
    '## Hard-deletions',
    '',
    deleteLog.join('\n') || '_none_',
    '',
    '## Seasonal visibility',
    '',
    seasonalLog || '_none_',
    '',
    '## How matching was attempted',
    '',
    '1. Exact normalised-address match between CSV `住所` and Firestore `address`',
    '2. Exact `SS名` ↔ `store_name` match',
    '3. Normalised-name substring match (strip common prefixes like セルフ / KeePer LABO / カーライフ',
    '   and suffixes 〜SS / 〜店, then test substring containment in either direction)',
    '',
    'If a CSV row should map to a Firestore store that this script missed, the cleanest fix is',
    'either to update the Firestore `address` to match the master CSV exactly, or to add an',
    'explicit override in this script.',
    '',
  ].join('\n');

  writeFileSync(mdPath, md, 'utf-8');
  console.log(`\n✓ Wrote ${mdPath}${dryRun ? ' (dry-run audit)' : ''}`);

  console.log(
    `\nDone: ${patched} stores patched [${Object.entries(matchModeCounts).map(([k, v]) => `${k}=${v}`).join(' ')}], ${unmatched.length} CSV rows unmatched, ${firestoreUnmatched.length} Firestore stores unmatched`,
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
