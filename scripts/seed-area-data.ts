/**
 * Seed 商圏グループ / 商圏エリア data from CSV into Firestore stores.
 *
 * Also:
 *   - Hard-deletes 3 named stores (logs before each delete; bails if >1 doc matches).
 *   - Sets seasonal visibility on 三笠中央SS (hide_mode='seasonal', 12-01 → 03-31).
 *   - Writes MISSING_DATA.md at repo root with reconciliation notes.
 *
 * Idempotent — safe to run multiple times.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-area-data.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path'; // resolve used for MISSING_DATA.md path

// ─── CSV path ────────────────────────────────────────────────

const CSV_PATH =
  '/Users/lucatrabuio/Downloads/proshop_groups_v2（修正済） CSV/商圏グループ別-Table 1.csv';

// ─── Stores to hard-delete ────────────────────────────────────

const STORES_TO_DELETE = [
  'カーライフサポート鳥取扇町',
  'カーライフフロンティア斐川',
  'カーライフ玉造SS',
];

// ─── Store to set seasonal hide ───────────────────────────────

const SEASONAL_STORE_NAME = '三笠中央SS';
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
  // Expect: SS名, 商圏グループ, 商圏エリア (or similar — find by content)
  const nameIdx = headers.findIndex(h => h.includes('SS名') || h === 'store_name' || h === '店舗名');
  const groupIdx = headers.findIndex(h => h.includes('商圏グループ'));
  const areaIdx = headers.findIndex(h => h.includes('商圏エリア') || h.includes('エリア'));

  if (nameIdx < 0) throw new Error(`Cannot find store name column. Headers: ${headers.join(', ')}`);
  if (groupIdx < 0) throw new Error(`Cannot find 商圏グループ column. Headers: ${headers.join(', ')}`);

  interface CsvRow { name: string; group: string; area: string }
  const csvRows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = (cols[nameIdx] ?? '').trim();
    if (!name) continue;
    csvRows.push({
      name,
      group: (cols[groupIdx] ?? '').trim(),
      area: areaIdx >= 0 ? (cols[areaIdx] ?? '').trim() : '',
    });
  }
  console.log(`Loaded ${csvRows.length} rows from CSV`);

  // ── Load Firestore stores ─────────────────────────────────
  const snapshot = await db.collection('stores').get();
  const allStores = snapshot.docs.map(d => ({ id: d.id, name: String(d.data().store_name ?? ''), ref: d.ref }));
  console.log(`Found ${allStores.length} stores in Firestore\n`);

  // Build lookup: store_name → Firestore doc ref
  const storeByName = new Map(allStores.map(s => [s.name, s.ref]));

  // ── Match CSV rows to Firestore ───────────────────────────
  const csvNamesMatched = new Set<string>();
  const firestoreNamesMatched = new Set<string>();
  let patched = 0;

  for (const row of csvRows) {
    const ref = storeByName.get(row.name);
    if (!ref) continue;
    csvNamesMatched.add(row.name);
    firestoreNamesMatched.add(row.name);

    const update: Record<string, string> = {};
    if (row.group) update.shouken_group = row.group;
    if (row.area) update.local_market_area = row.area;

    if (dryRun) {
      console.log(`[dry-run] PATCH ${row.name}: ${JSON.stringify(update)}`);
    } else {
      await ref.update(update);
      console.log(`✓ ${row.name}: ${JSON.stringify(update)}`);
    }
    patched++;
  }

  // ── Reconciliation ────────────────────────────────────────
  const csvMissing = csvRows.filter(r => !csvNamesMatched.has(r.name)).map(r => r.name);
  const firestoreMissing = allStores.map(s => s.name).filter(n => !firestoreNamesMatched.has(n));

  // ── Hard deletes ──────────────────────────────────────────
  const deleteLog: string[] = [];
  for (const storeName of STORES_TO_DELETE) {
    const matches = allStores.filter(s => s.name === storeName);
    if (matches.length === 0) {
      console.log(`DELETE skip: "${storeName}" not found in Firestore`);
      deleteLog.push(`- "${storeName}" — not found in Firestore (already deleted?)`);
      continue;
    }
    if (matches.length > 1) {
      console.error(`BAIL: "${storeName}" matches ${matches.length} docs — manual review required`);
      deleteLog.push(`- "${storeName}" — BAIL: ${matches.length} docs matched, skipped`);
      continue;
    }
    const { id, ref } = matches[0];
    console.log(`DELETE: "${storeName}" (id=${id})`);
    if (!dryRun) {
      await ref.delete();
      console.log(`  ✓ deleted`);
    }
    deleteLog.push(`- "${storeName}" (id=${id}) — hard-deleted${dryRun ? ' [dry-run]' : ''}`);
  }

  // ── Seasonal visibility for 三笠中央SS ────────────────────
  const seasonalMatches = allStores.filter(s => s.name === SEASONAL_STORE_NAME);
  let seasonalLog = '';
  if (seasonalMatches.length === 0) {
    console.log(`SEASONAL skip: "${SEASONAL_STORE_NAME}" not found`);
    seasonalLog = `- "${SEASONAL_STORE_NAME}" — not found in Firestore`;
  } else if (seasonalMatches.length > 1) {
    console.error(`BAIL seasonal: "${SEASONAL_STORE_NAME}" matches ${seasonalMatches.length} docs`);
    seasonalLog = `- "${SEASONAL_STORE_NAME}" — BAIL: ${seasonalMatches.length} docs, skipped`;
  } else {
    const { id, ref } = seasonalMatches[0];
    console.log(`SEASONAL: "${SEASONAL_STORE_NAME}" (id=${id}) → hide_mode=seasonal ${SEASONAL_START}–${SEASONAL_END}`);
    if (!dryRun) {
      await ref.update({
        hide_mode: 'seasonal',
        seasonal_hide_start: SEASONAL_START,
        seasonal_hide_end: SEASONAL_END,
      });
      console.log('  ✓ seasonal visibility set');
    }
    seasonalLog = `- "${SEASONAL_STORE_NAME}" (id=${id}) — hide_mode=seasonal, ${SEASONAL_START}–${SEASONAL_END}${dryRun ? ' [dry-run]' : ''}`;
  }

  // ── Write MISSING_DATA.md ─────────────────────────────────
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  const md = [
    '# MISSING_DATA — 商圏グループ seed audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    `CSV rows: ${csvRows.length}  |  Firestore stores: ${allStores.length}  |  Patched: ${patched}`,
    '',
    '## CSV rows that had no matching Firestore store',
    csvMissing.length === 0 ? '_none_' : csvMissing.map(n => `- ${n}`).join('\n'),
    '',
    '## Firestore stores not found in CSV',
    firestoreMissing.length === 0 ? '_none_' : firestoreMissing.map(n => `- ${n}`).join('\n'),
    '',
    '## Hard-deleted stores',
    deleteLog.join('\n') || '_none_',
    '',
    '## Seasonal visibility changes',
    seasonalLog || '_none_',
    '',
  ].join('\n');

  if (dryRun) {
    console.log('\n[dry-run] MISSING_DATA.md would be written to:', mdPath);
    console.log(md);
  } else {
    writeFileSync(mdPath, md, 'utf-8');
    console.log(`\n✓ Wrote ${mdPath}`);
  }

  console.log(`\nDone: ${patched} stores patched, ${csvMissing.length} CSV rows unmatched, ${firestoreMissing.length} Firestore stores not in CSV`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
