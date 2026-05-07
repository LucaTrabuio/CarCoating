/**
 * Reconcile duplicate-address pairs in the stores collection, then
 * hard-delete the three 削除 shops that landed via the import script.
 *
 * Strategy per duplicate-address group:
 *   1. Pick the "winner" — the doc with the most-populated fields
 *      (tel, business_hours, lat/lng, hero_image, page_layout etc.).
 *      Tie-break: shorter store_id (originals have hand-crafted slugs
 *      like "kobe-shinkaichi"; my import script generates
 *      "<sc>-<n>" placeholders).
 *   2. Look up the master CSV row at that address — that gives us
 *      the canonical SS名 and the correct (商圏グループ, ローカルマーケエリア).
 *   3. Update the winner: store_name = CSV name, shouken_group +
 *      local_market_area from CSV. Move the winner's sub_company_id
 *      if the local_market_area implies a different sub_company than
 *      it currently sits under (the operator's existing mapping).
 *      Everything else on the winner is preserved.
 *   4. Delete the loser(s). Update sub_company.stores arrays.
 *
 * Plus, hard-delete the three 削除 shops (resolve them via the same
 * matcher as seed-area-data.ts; they were re-imported because they
 * exist in the master CSV).
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/dedupe-stores.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { readFileSync, appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const CSV_PATH =
  '/Users/lucatrabuio/Downloads/proshop_groups_v2（修正済） CSV/商圏グループ別-Table 1.csv';

const STORES_TO_DELETE_SS_NAMES = [
  'カーライフサポート鳥取扇町',
  'カーライフフロンティア斐川',
  'カーライフ玉造SS',
];

// ─── Helpers (mirrored from sibling scripts) ──────────────────

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

// "Populated-ness" score — higher = more curated, more likely the original.
function scoreCompleteness(doc: FirebaseFirestore.DocumentData): number {
  let score = 0;
  for (const k of [
    'tel', 'business_hours', 'regular_holiday', 'email', 'line_url',
    'landmark', 'nearby_stations', 'access_map_url',
    'hero_title', 'hero_subtitle', 'description',
    'meta_description', 'seo_keywords',
    'hero_image_url', 'logo_url', 'staff_photo_url',
    'campaign_title', 'campaign_color_code', 'google_place_id',
  ]) {
    const v = doc[k];
    if (typeof v === 'string' && v.length > 0) score += 1;
  }
  if (Array.isArray(doc.gallery_images) && doc.gallery_images.length > 0) score += 2;
  if (Array.isArray(doc.custom_services) && doc.custom_services.length > 0) score += 2;
  if (Array.isArray(doc.promo_banners) && doc.promo_banners.length > 0) score += 1;
  if (typeof doc.lat === 'number' && doc.lat !== 0) score += 1;
  if (typeof doc.lng === 'number' && doc.lng !== 0) score += 1;
  if (doc.page_layout) score += 3; // page_layout is a strong signal of a curated store
  if (typeof doc.parking_spaces === 'number' && doc.parking_spaces > 0) score += 1;
  return score;
}

interface FsStore {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
}

interface CsvRow { name: string; group: string; area: string; address: string; addressNorm: string; }

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

  // ── Load CSV (for address → canonical name + area lookup) ──
  const raw = readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const findCol = (...needles: string[]) => {
    for (const n of needles) { const i = headers.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const idx = {
    name: findCol('SS名'), group: findCol('商圏グループ'),
    area: findCol('ローカルマーケエリア'), address: findCol('住所'),
  };
  const csvRows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = (cols[idx.name] ?? '').trim();
    if (!name) continue;
    const address = (cols[idx.address] ?? '').trim();
    csvRows.push({
      name,
      group: (cols[idx.group] ?? '').trim(),
      area: (cols[idx.area] ?? '').trim(),
      address,
      addressNorm: normaliseAddress(address),
    });
  }
  const csvByAddrNorm = new Map(csvRows.map(r => [r.addressNorm, r] as const));
  const csvByName = new Map(csvRows.map(r => [r.name, r] as const));

  // ── Load all stores ───────────────────────────────────────
  const snap = await db.collection('stores').get();
  const allStores: FsStore[] = snap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));
  console.log(`Loaded ${allStores.length} stores`);

  // ── Build local_market_area → preferred sub_company_id from
  //    the FRESHEST mapping (existing data after seed). Used to move
  //    a winner if its current sub_company_id doesn't match its lma.
  const lmaToScCount = new Map<string, Map<string, number>>();
  for (const s of allStores) {
    const lma = String(s.data.local_market_area ?? '');
    const sc = String(s.data.sub_company_id ?? '');
    if (!lma || !sc) continue;
    if (!lmaToScCount.has(lma)) lmaToScCount.set(lma, new Map());
    const m = lmaToScCount.get(lma)!;
    m.set(sc, (m.get(sc) ?? 0) + 1);
  }
  const lmaToSc = new Map<string, string>();
  for (const [lma, counts] of lmaToScCount.entries()) {
    let best: [string, number] | null = null;
    for (const [sc, n] of counts.entries()) {
      if (!best || n > best[1]) best = [sc, n];
    }
    if (best) lmaToSc.set(lma, best[0]);
  }

  // ── Group stores by normalised address ───────────────────
  const byAddrNorm = new Map<string, FsStore[]>();
  for (const s of allStores) {
    const a = normaliseAddress(String(s.data.address ?? ''));
    if (!a) continue;
    if (!byAddrNorm.has(a)) byAddrNorm.set(a, []);
    byAddrNorm.get(a)!.push(s);
  }
  const dupGroups = [...byAddrNorm.entries()].filter(([, list]) => list.length > 1);
  console.log(`Duplicate-address groups: ${dupGroups.length}\n`);

  // ── Resolve each duplicate ───────────────────────────────
  interface Plan {
    addr: string;
    winnerId: string;
    losers: string[];
    csvName: string | null;
    csvGroup: string | null;
    csvArea: string | null;
    moveScFrom: string | null;
    moveScTo: string | null;
  }
  const plans: Plan[] = [];

  // Placeholder pattern: ids like "miki-3" or "tokyo-area-1" (auto-imported,
  // not hand-curated). Combined with score=0 to be sure.
  const PLACEHOLDER_ID_RE = /^[a-z-]+-\d+$/;
  const isPlaceholder = (s: FsStore) =>
    PLACEHOLDER_ID_RE.test(s.id) && scoreCompleteness(s.data) === 0;

  const flagged: { addr: string; list: FsStore[]; reason: string }[] = [];

  for (const [addrNorm, list] of dupGroups) {
    const placeholders = list.filter(isPlaceholder);
    const curated = list.filter(s => !isPlaceholder(s));

    if (placeholders.length === 0 || curated.length === 0) {
      // Either everyone is curated (real-data conflict — manual review),
      // or everyone is a placeholder (shouldn't happen). Flag, don't touch.
      flagged.push({
        addr: addrNorm,
        list,
        reason:
          placeholders.length === 0
            ? 'multiple curated stores share this address — likely wrong address on one record'
            : 'multiple placeholder imports collide on this address',
      });
      console.log(`FLAGGED @ ${addrNorm}`);
      list.forEach(s =>
        console.log(`  ?  ${s.id} score=${scoreCompleteness(s.data)} sc=${s.data.sub_company_id} name="${s.data.store_name}"`),
      );
      console.log(`  → manual review required (no auto-merge)\n`);
      continue;
    }

    // One curated + one or more placeholders → auto-merge.
    curated.sort((a, b) => {
      const sa = scoreCompleteness(a.data);
      const sb = scoreCompleteness(b.data);
      if (sb !== sa) return sb - sa;
      return a.id.length - b.id.length;
    });
    const winner = curated[0];
    const losers = [...curated.slice(1), ...placeholders];

    const csvRow = csvByAddrNorm.get(addrNorm) ?? null;
    const winnerSc = String(winner.data.sub_company_id ?? '');
    const correctSc = csvRow ? lmaToSc.get(csvRow.area) ?? winnerSc : winnerSc;

    plans.push({
      addr: addrNorm,
      winnerId: winner.id,
      losers: losers.map(l => l.id),
      csvName: csvRow?.name ?? null,
      csvGroup: csvRow?.group ?? null,
      csvArea: csvRow?.area ?? null,
      moveScFrom: winnerSc !== correctSc ? winnerSc : null,
      moveScTo: winnerSc !== correctSc ? correctSc : null,
    });

    console.log(`GROUP @ ${addrNorm}`);
    console.log(`  KEEP   ${winner.id} score=${scoreCompleteness(winner.data)} sc=${winner.data.sub_company_id} name="${winner.data.store_name}"`);
    losers.forEach(s =>
      console.log(`  DELETE ${s.id} score=${scoreCompleteness(s.data)} sc=${s.data.sub_company_id} name="${s.data.store_name}"`),
    );
    if (csvRow) {
      console.log(`  CSV: name="${csvRow.name}" group="${csvRow.group}" area="${csvRow.area}"`);
    } else {
      console.log(`  CSV: (no row at this address — skipping name/area update)`);
    }
    if (winnerSc !== correctSc) {
      console.log(`  MOVE: ${winner.id} sub_company ${winnerSc} → ${correctSc}`);
    }
    console.log();
  }

  // ── 削除 shops to hard-delete ─────────────────────────────
  interface DelPlan { ssName: string; storeId: string | null; reason: string }
  const deletePlans: DelPlan[] = [];
  for (const ssName of STORES_TO_DELETE_SS_NAMES) {
    const csv = csvByName.get(ssName);
    let storeId: string | null = null;
    let reason = '';
    if (csv?.addressNorm) {
      const list = byAddrNorm.get(csv.addressNorm) ?? [];
      // Don't delete a doc that's already a winner of a dedup plan
      const winnerIds = new Set(plans.map(p => p.winnerId));
      const candidate = list.find(s => !winnerIds.has(s.id));
      if (candidate) {
        storeId = candidate.id;
        reason = `address match (${csv.addressNorm})`;
      }
    }
    if (!storeId) {
      const exact = allStores.find(s => String(s.data.store_name ?? '') === ssName);
      if (exact) {
        storeId = exact.id;
        reason = 'exact name match';
      }
    }
    deletePlans.push({ ssName, storeId, reason: storeId ? reason : 'not found' });
    console.log(`DELETE: "${ssName}" → ${storeId ?? '(not found)'}${storeId ? ` [${reason}]` : ''}`);
  }

  // ── Apply ─────────────────────────────────────────────────
  if (!dryRun) {
    console.log('\nApplying writes…\n');

    // 1. Update winners
    for (const p of plans) {
      const update: Record<string, unknown> = {};
      if (p.csvName) update.store_name = p.csvName;
      if (p.csvGroup) update.shouken_group = p.csvGroup;
      if (p.csvArea) update.local_market_area = p.csvArea;
      if (p.moveScTo) update.sub_company_id = p.moveScTo;
      if (Object.keys(update).length > 0) {
        await db.collection('stores').doc(p.winnerId).update(update);
        console.log(`  ✓ updated ${p.winnerId}: ${JSON.stringify(update)}`);
      }
    }

    // 2. Delete losers
    for (const p of plans) {
      for (const loserId of p.losers) {
        await db.collection('stores').doc(loserId).delete();
        console.log(`  ✓ deleted (dup) ${loserId}`);
      }
    }

    // 3. Hard-delete 削除 shops
    for (const dp of deletePlans) {
      if (!dp.storeId) continue;
      await db.collection('stores').doc(dp.storeId).delete();
      console.log(`  ✓ deleted (削除) ${dp.storeId} ← "${dp.ssName}"`);
    }

    // 4. Update sub_company.stores arrays
    // Collect adds (winner moves) and removes (losers + 削除).
    const removedIds = new Set<string>([
      ...plans.flatMap(p => p.losers),
      ...deletePlans.filter(d => d.storeId).map(d => d.storeId!),
    ]);
    const addsBySc = new Map<string, string[]>();
    const removesBySc = new Map<string, string[]>();
    // Winner moves: remove from old sc, add to new sc
    for (const p of plans) {
      if (!p.moveScFrom || !p.moveScTo) continue;
      if (!removesBySc.has(p.moveScFrom)) removesBySc.set(p.moveScFrom, []);
      removesBySc.get(p.moveScFrom)!.push(p.winnerId);
      if (!addsBySc.has(p.moveScTo)) addsBySc.set(p.moveScTo, []);
      addsBySc.get(p.moveScTo)!.push(p.winnerId);
    }
    // Loser deletions: remove from their sub_company
    for (const p of plans) {
      const losers = p.losers.map(id => allStores.find(s => s.id === id)).filter(Boolean) as FsStore[];
      for (const l of losers) {
        const sc = String(l.data.sub_company_id ?? '');
        if (!sc) continue;
        if (!removesBySc.has(sc)) removesBySc.set(sc, []);
        removesBySc.get(sc)!.push(l.id);
      }
    }
    // 削除 deletions
    for (const dp of deletePlans) {
      if (!dp.storeId) continue;
      const s = allStores.find(s => s.id === dp.storeId);
      if (!s) continue;
      const sc = String(s.data.sub_company_id ?? '');
      if (!sc) continue;
      if (!removesBySc.has(sc)) removesBySc.set(sc, []);
      removesBySc.get(sc)!.push(dp.storeId);
    }
    for (const [scId, ids] of removesBySc.entries()) {
      await db.collection('sub_companies').doc(scId).update({
        stores: FieldValue.arrayRemove(...ids),
      });
      console.log(`  ✓ sub_company ${scId} -= ${ids.length}`);
    }
    for (const [scId, ids] of addsBySc.entries()) {
      await db.collection('sub_companies').doc(scId).update({
        stores: FieldValue.arrayUnion(...ids),
      });
      console.log(`  ✓ sub_company ${scId} += ${ids.length}`);
    }
    console.log('\nDone.');
    void removedIds;
  }

  // ── Append summary to MISSING_DATA.md ─────────────────────
  const md = [
    '',
    '---',
    '',
    `## Dedup + 削除 cleanup — ${dryRun ? 'dry-run preview' : new Date().toISOString()}`,
    '',
    '### Duplicate-address resolutions',
    '',
    '| Address | Kept | Deleted | New name | New area | Sub-company move |',
    '|---|---|---|---|---|---|',
    ...plans.map(p =>
      `| ${p.addr} | \`${p.winnerId}\` | ${p.losers.map(l => `\`${l}\``).join(', ')} | ${p.csvName ?? '_unchanged_'} | ${p.csvArea ?? '_unchanged_'} | ${p.moveScTo ? `${p.moveScFrom} → ${p.moveScTo}` : '_no_'} |`,
    ),
    '',
    '### 削除 shops hard-deleted',
    '',
    ...deletePlans.map(dp => `- "${dp.ssName}" → ${dp.storeId ? `\`${dp.storeId}\` (${dp.reason})` : '_not found_'}`),
    '',
    '### Flagged duplicate-address groups (NOT auto-merged — manual review)',
    '',
    flagged.length === 0
      ? '_none_'
      : flagged
          .map(
            f =>
              `- **${f.addr}**: ${f.list.map(s => `\`${s.id}\` ("${s.data.store_name}")`).join(' vs ')} — ${f.reason}`,
          )
          .join('\n'),
    '',
  ].join('\n');
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  if (existsSync(mdPath)) appendFileSync(mdPath, md, 'utf-8');
  console.log(`\n✓ Appended dedup section to ${mdPath}`);

  console.log(
    `\nSummary: ${plans.length} dup groups (${plans.reduce((n, p) => n + p.losers.length, 0)} deletions), ${deletePlans.filter(d => d.storeId).length}/3 削除 shops removed${dryRun ? ' [dry-run]' : ''}`,
  );
}

main().catch(err => { console.error(err); process.exit(1); });
