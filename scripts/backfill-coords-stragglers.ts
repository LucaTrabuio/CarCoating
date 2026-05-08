/**
 * Targeted geocoder for the 9 stores backfill-coords.ts couldn't resolve
 * because their addresses contain unusual notation (Sapporo-style 条丁目
 * grid, rural 字 koaza names, missing 丁目 separators, etc.).
 *
 * For each store we keep a list of address variations to try. The script:
 *  - tries each variation in order,
 *  - accepts the first result whose precision is ROOFTOP, RANGE_INTERPOLATED,
 *    or GEOMETRIC_CENTER (rejects APPROXIMATE — same rule as the main script),
 *  - prints the resolution table for review,
 *  - writes back lat/lng to Firestore only with --apply.
 *
 * USAGE
 *   # Dry-run
 *   npx tsx --env-file=.env.local scripts/backfill-coords-stragglers.ts
 *   # Apply
 *   npx tsx --env-file=.env.local scripts/backfill-coords-stragglers.ts --apply
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');

const API_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('No geocoding API key found.');
  process.exit(1);
}

// Hardcoded fallback for stores that Geocoding can't pin to a building or
// even an interpolated street. Written only when every Geocoding attempt
// returns APPROXIMATE — strictly better than (0,0) since the pin lands in
// the correct neighborhood. These were captured by querying Geocoding for
// the area name (no building number) on 2026-05-08.
const FALLBACK_AREA_CENTROIDS: Record<string, { lat: number; lng: number; note: string }> = {
  'yonago-sanyanagi': {
    lat: 35.4595596,
    lng: 133.3237142,
    note: '鳥取県米子市両三柳 area centroid — Geocoding has no rooftop data for #4385',
  },
};

// Per-store variations to try. Order matters — earliest match wins.
// Each variation is what we send to Google as the `address` query.
// We don't write the variant string back to Firestore — only the lat/lng.
const VARIATIONS: Record<string, { storeName: string; original: string; tries: string[] }> = {
  'asahikawa-midorigaoka': {
    storeName: 'セルフ緑が丘SS',
    original: '北海道旭川市緑が丘３条3',
    tries: [
      'セルフ緑が丘SS 旭川市',
      '緑が丘SS 旭川',
      '北海道旭川市緑が丘三条三丁目',
      '北海道旭川市緑が丘3条3丁目',
      '北海道旭川市緑が丘東3条3',
      '北海道旭川市緑が丘',
    ],
  },
  'fukuoka-notame': {
    storeName: 'セルフステーション野多目SS',
    original: '福岡県福岡市南区野多目2丁目368-1',
    tries: [
      'セルフステーション野多目SS 福岡',
      '野多目SS 福岡市',
      '福岡県福岡市南区野多目2丁目',
      '福岡県福岡市南区野多目',
    ],
  },
  'gifu-fukuju': {
    storeName: 'セルフ岐阜福寿町',
    original: '岐阜県羽島市福寿町本郷365-2',
    tries: [
      '岐阜県羽島市福寿町本郷365',
      '岐阜県羽島市福寿町本郷字本郷365-2',
      '岐阜県羽島市福寿町本郷',
    ],
  },
  'iwanuma-bypass': {
    storeName: 'セルフ岩沼バイパスSS',
    original: '宮城県岩沼市藤浪1丁目146-1',
    tries: [
      'セルフ岩沼バイパスSS',
      '岩沼バイパスSS 宮城',
      '宮城県岩沼市藤浪1丁目',
      '宮城県岩沼市藤浪',
    ],
  },
  'nara': {
    storeName: '榛原SS',
    original: '奈良県宇陀市榛原萩原元玉小西2460-4',
    tries: [
      '奈良県宇陀市榛原萩原2460-4',
      '奈良県宇陀市榛原萩原元玉2460-4',
      '奈良県宇陀市榛原萩原',
    ],
  },
  'osaki-misato': {
    storeName: 'セルフ美里SS',
    original: '宮城県遠田郡美里町練牛字14号32',
    tries: [
      'セルフ美里SS 宮城',
      '美里SS 遠田郡',
      '宮城県遠田郡美里町練牛14号',
      '宮城県遠田郡美里町練牛',
      '宮城県遠田郡美里町',
    ],
  },
  'sakai-portas': {
    storeName: '堺ポルタスSS',
    original: '大阪府堺市堺区神南辺町3-100',
    tries: [
      '堺ポルタスSS',
      '堺ポルタス 堺市',
      '大阪府堺市堺区神南辺町3丁目',
      '大阪府堺市堺区神南辺町',
    ],
  },
  'suzuka': {
    storeName: '鈴鹿伊船SS',
    original: '三重県鈴鹿市伊船町字中下ノ割2215-2',
    tries: [
      '三重県鈴鹿市伊船町2215-2',
      '三重県鈴鹿市伊船町2215',
      '三重県鈴鹿市伊船町中下ノ割2215-2',
    ],
  },
  'yonago-sanyanagi': {
    storeName: 'パートナー両三柳SS',
    original: '鳥取県米子市両三柳4385-2',
    tries: [
      'パートナー両三柳SS 米子',
      '両三柳SS 米子市',
      '鳥取県米子市両三柳4385',
      '鳥取県米子市両三柳',
    ],
  },
};

type GeocodeResult = {
  status: string;
  results?: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      location_type: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
    };
  }>;
  error_message?: string;
};

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function geocode(address: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'jp');
  url.searchParams.set('language', 'ja');
  url.searchParams.set('key', API_KEY!);
  const res = await fetch(url.toString());
  const data = (await res.json()) as GeocodeResult;
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    return { ok: false as const, reason: `${data.status}${data.error_message ? `: ${data.error_message}` : ''}` };
  }
  const top = data.results[0];
  if (top.geometry.location_type === 'APPROXIMATE') {
    return { ok: false as const, reason: 'APPROXIMATE' };
  }
  return {
    ok: true as const,
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    precision: top.geometry.location_type,
    formatted: top.formatted_address,
  };
}

async function tryVariations(tries: string[]) {
  for (const v of tries) {
    const r = await geocode(v);
    await sleep(120); // throttle
    if (r.ok) return { ...r, used: v };
  }
  return null;
}

async function main() {
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

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  type Hit = { storeId: string; lat: number; lng: number; precision: string; used: string; formatted: string };
  const hits: Hit[] = [];
  const misses: Array<{ storeId: string; tried: string[] }> = [];

  for (const [storeId, info] of Object.entries(VARIATIONS)) {
    process.stdout.write(`${storeId.padEnd(28)} ${info.storeName.padEnd(30)} `);
    const result = await tryVariations(info.tries);
    if (result) {
      console.log(`✓ ${result.precision.padEnd(20)} via "${result.used}"`);
      console.log(`${' '.repeat(60)} → ${result.formatted}  (${result.lat.toFixed(6)}, ${result.lng.toFixed(6)})`);
      hits.push({ storeId, lat: result.lat, lng: result.lng, precision: result.precision, used: result.used, formatted: result.formatted });
    } else if (FALLBACK_AREA_CENTROIDS[storeId]) {
      const fb = FALLBACK_AREA_CENTROIDS[storeId];
      console.log(`⚠ FALLBACK_AREA_CENTROID    via hardcoded centroid`);
      console.log(`${' '.repeat(60)} → ${fb.note}  (${fb.lat.toFixed(6)}, ${fb.lng.toFixed(6)})`);
      hits.push({ storeId, lat: fb.lat, lng: fb.lng, precision: 'AREA_CENTROID', used: 'hardcoded', formatted: fb.note });
    } else {
      console.log(`✗ all variations failed`);
      misses.push({ storeId, tried: info.tries });
    }
  }

  console.log(`\nResolved: ${hits.length} / ${Object.keys(VARIATIONS).length}`);
  if (misses.length) {
    console.log(`Still missing: ${misses.map(m => m.storeId).join(', ')}`);
  }

  if (!APPLY) {
    console.log('\n[DRY-RUN] No Firestore writes. Re-run with --apply once the matches above look right.');
    return;
  }

  if (hits.length === 0) {
    console.log('\nNothing to write.');
    return;
  }

  console.log(`\nWriting ${hits.length} doc(s) to Firestore...`);
  const batch = db.batch();
  for (const h of hits) {
    batch.set(db.collection('stores').doc(h.storeId), { lat: h.lat, lng: h.lng }, { merge: true });
  }
  await batch.commit();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
