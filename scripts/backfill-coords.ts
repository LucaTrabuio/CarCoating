/**
 * Backfill lat/lng for stores missing coordinates by geocoding their
 * `address` field via the Google Geocoding API.
 *
 * USAGE
 *   # 1) Dry-run — geocode + print table, NO writes
 *   npx tsx --env-file=.env.local scripts/backfill-coords.ts
 *
 *   # 2) Real run — write back lat/lng to Firestore
 *   npx tsx --env-file=.env.local scripts/backfill-coords.ts --apply
 *
 *   # 3) Limit to a subset (handy after spot-checking the dry-run)
 *   npx tsx --env-file=.env.local scripts/backfill-coords.ts --apply \
 *     --only=meguro-yakumo,minato-aoyama
 *
 * REQUIRES
 *   - One of: GOOGLE_GEOCODING_API_KEY, GOOGLE_PLACES_API_KEY, or
 *     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (the script tries them in that
 *     order). The Geocoding API must be enabled on the project for
 *     whichever key is used; otherwise the response is REQUEST_DENIED.
 *   - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 *     for admin Firestore writes.
 *
 * SAFETY
 *   - Idempotent: skips stores that already have non-zero lat AND lng.
 *   - Skips results with location_type = APPROXIMATE (those often
 *     resolve to the prefecture centroid; that's worse than (0,0)
 *     because the user can't tell something is wrong).
 *   - Throttles to 10 req/s.
 *   - Without --apply, performs no Firestore writes — only prints
 *     the resolution table for review.
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const ONLY_ARG = process.argv.find(a => a.startsWith('--only='));
const ONLY = ONLY_ARG ? new Set(ONLY_ARG.replace('--only=', '').split(',').filter(Boolean)) : null;

const API_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('No geocoding API key found. Set GOOGLE_GEOCODING_API_KEY, GOOGLE_PLACES_API_KEY, or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.');
  process.exit(1);
}

type GeocodeResult = {
  status: 'OK' | 'ZERO_RESULTS' | 'REQUEST_DENIED' | 'OVER_QUERY_LIMIT' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  results?: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      location_type: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
    };
  }>;
  error_message?: string;
};

async function geocodeOnce(address: string): Promise<{
  ok: true;
  lat: number;
  lng: number;
  precision: string;
  formatted: string;
} | { ok: false; reason: string; transient: boolean }> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'jp');
  url.searchParams.set('language', 'ja');
  url.searchParams.set('key', API_KEY!);

  const res = await fetch(url.toString());
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, transient: res.status >= 500 };
  const data = (await res.json()) as GeocodeResult;
  if (data.status !== 'OK') {
    const reason = `${data.status}${data.error_message ? `: ${data.error_message}` : ''}`;
    // Google occasionally returns REQUEST_DENIED with "API key is expired"
    // text under transient quota pressure even when the key is valid; same
    // for OVER_QUERY_LIMIT and UNKNOWN_ERROR. Treat these as retryable.
    const transient =
      data.status === 'OVER_QUERY_LIMIT' ||
      data.status === 'UNKNOWN_ERROR' ||
      (data.status === 'REQUEST_DENIED' && /expired/i.test(data.error_message || ''));
    return { ok: false, reason, transient };
  }
  if (!data.results || data.results.length === 0) {
    return { ok: false, reason: 'no results', transient: false };
  }
  const top = data.results[0];
  if (top.geometry.location_type === 'APPROXIMATE') {
    return { ok: false, reason: 'precision=APPROXIMATE (rejected)', transient: false };
  }
  return {
    ok: true,
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    precision: top.geometry.location_type,
    formatted: top.formatted_address,
  };
}

async function geocode(address: string) {
  // Up to 3 attempts with exponential backoff for transient errors. Permanent
  // errors (no results, APPROXIMATE precision, malformed key) fail immediately.
  const delays = [400, 1200, 3000];
  let last: Awaited<ReturnType<typeof geocodeOnce>> | null = null;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    last = await geocodeOnce(address);
    if (last.ok) return last;
    if (!last.transient) return last;
    await sleep(delays[attempt]);
  }
  return last!;
}

function pad(s: string, n: number) {
  // Width-based padding ignoring multibyte width — good enough for log readability.
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  console.log(`Mode: ${APPLY ? 'APPLY (will write to Firestore)' : 'DRY-RUN (no writes)'}`);
  if (ONLY) console.log(`Filter: --only=${[...ONLY].join(',')}`);
  console.log('');

  const all = await db.collection('stores').get();

  type Target = {
    docId: string;
    store_id: string;
    store_name: string;
    address: string;
  };

  const targets: Target[] = [];
  for (const d of all.docs) {
    const data = d.data() as Record<string, unknown>;
    const lat = data.lat;
    const lng = data.lng;
    const latNum = typeof lat === 'number' ? lat : typeof lat === 'string' ? Number(lat) : NaN;
    const lngNum = typeof lng === 'number' ? lng : typeof lng === 'string' ? Number(lng) : NaN;
    const hasCoords = Number.isFinite(latNum) && latNum !== 0 && Number.isFinite(lngNum) && lngNum !== 0;
    if (hasCoords) continue;

    const store_id = (data.store_id as string) || d.id;
    if (ONLY && !ONLY.has(store_id)) continue;

    const address = ((data.address as string) || '').trim();
    if (!address) continue; // can't geocode without an address

    targets.push({
      docId: d.id,
      store_id,
      store_name: (data.store_name as string) || '(no name)',
      address,
    });
  }

  console.log(`${targets.length} store${targets.length === 1 ? '' : 's'} to geocode.`);
  console.log('─'.repeat(120));
  console.log(`${pad('store_id', 28)} ${pad('lat', 12)} ${pad('lng', 12)} ${pad('precision', 22)} address → formatted`);
  console.log('─'.repeat(120));

  let resolved = 0;
  let rejected = 0;
  const writes: Array<{ docId: string; lat: number; lng: number }> = [];

  for (const t of targets) {
    const result = await geocode(t.address);
    if (!result.ok) {
      console.log(`${pad(t.store_id, 28)} ${pad('—', 12)} ${pad('—', 12)} ${pad(`✗ ${result.reason}`, 22)} ${t.address}`);
      rejected++;
    } else {
      console.log(
        `${pad(t.store_id, 28)} ${pad(result.lat.toFixed(6), 12)} ${pad(result.lng.toFixed(6), 12)} ${pad(`✓ ${result.precision}`, 22)} ${t.address} → ${result.formatted}`,
      );
      writes.push({ docId: t.docId, lat: result.lat, lng: result.lng });
      resolved++;
    }
    // Throttle to ~10 req/s.
    await sleep(110);
  }

  console.log('─'.repeat(120));
  console.log(`Resolved: ${resolved}   Rejected: ${rejected}   Total: ${targets.length}`);

  if (!APPLY) {
    console.log('\n[DRY-RUN] No Firestore writes performed. Re-run with --apply to commit the resolved coordinates.');
    return;
  }

  if (writes.length === 0) {
    console.log('\nNo successful resolutions to write.');
    return;
  }

  console.log(`\nWriting ${writes.length} doc${writes.length === 1 ? '' : 's'} to Firestore...`);
  // Firestore batch limit is 500 writes per batch. We'll never hit that
  // here (cap is 102) but the loop is defensive.
  const BATCH_SIZE = 400;
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const slice = writes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const w of slice) {
      const ref = db.collection('stores').doc(w.docId);
      batch.set(ref, { lat: w.lat, lng: w.lng }, { merge: true });
    }
    await batch.commit();
    console.log(`  ✓ committed ${slice.length} (cumulative ${Math.min(i + BATCH_SIZE, writes.length)} / ${writes.length})`);
  }
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
