import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Stores that need re-geocoding even if they already have coords
// (because their address changed)
const FORCE_IDS = new Set<string>(['cardock-nishinari']);

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted?: string;
}

// Use OpenStreetMap Nominatim (free, no key). 1 req/sec max, User-Agent required.
async function nominatim(address: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=jp&limit=1&accept-language=ja`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'car-coating-store-directory/1.0 (admin@keeper-proshop.local)',
      'Accept-Language': 'ja',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    formatted: data[0].display_name,
  };
}

// Generate progressively coarser versions of a Japanese address.
// e.g. "茨城県水戸市中丸町331-4" →
//   [full, "茨城県水戸市中丸町", "茨城県水戸市", "茨城県"]
function coarseVariants(address: string): string[] {
  const variants: string[] = [address];
  // Strip trailing 番地 numbers (e.g., "331-4", "19地割28番5", "5-28-6")
  const withoutNumbers = address.replace(/[\s\d一二三四五六七八九〇]+[-‐－ー]?[\d\u4e00-\u9fffぁ-んァ-ヶ]*(番地?|号|地割)?$/u, '').trim();
  if (withoutNumbers && withoutNumbers !== address) variants.push(withoutNumbers);

  // Find 市/区/町/村 boundary — keep up to and including the last one
  const cityMatch = address.match(/^(.+?[都道府県].+?[市区町村])/);
  if (cityMatch && cityMatch[1] !== variants[variants.length - 1]) {
    variants.push(cityMatch[1]);
  }

  // Just prefecture
  const prefMatch = address.match(/^(.+?[都道府県])/);
  if (prefMatch && prefMatch[1] !== variants[variants.length - 1]) {
    variants.push(prefMatch[1]);
  }

  return variants;
}

async function geocode(address: string): Promise<GeocodeResult | null> {
  const variants = coarseVariants(address);
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const result = await nominatim(v);
    if (result) {
      if (i > 0) console.log(`  (fallback level ${i}: "${v}")`);
      return result;
    }
    // Rate limit between fallback retries
    if (i < variants.length - 1) await new Promise(r => setTimeout(r, 1100));
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
  const snap = await db.collection('stores').get();

  const targets: { id: string; address: string; reason: string }[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const lat = d.lat;
    const lng = d.lng;
    const hasCoords = (typeof lat === 'number' && lat !== 0) || (typeof lat === 'string' && lat !== '' && lat !== '0');
    const address = d.address;

    if (!address) continue;
    if (FORCE_IDS.has(doc.id)) {
      targets.push({ id: doc.id, address, reason: 'force re-geocode (address changed)' });
      continue;
    }
    if (!hasCoords) {
      targets.push({ id: doc.id, address, reason: 'missing coords' });
    }
  }

  console.log(`Geocoding ${targets.length} stores...\n`);

  let ok = 0;
  let failed = 0;

  for (const t of targets) {
    console.log(`[${t.id}] ${t.address}  (${t.reason})`);
    const result = await geocode(t.address);
    if (!result) {
      failed++;
      continue;
    }
    await db.collection('stores').doc(t.id).update({
      lat: result.lat,
      lng: result.lng,
    });
    console.log(`  ✓ ${result.lat}, ${result.lng}  →  ${result.formatted || ''}`);
    ok++;
    // Nominatim: strict 1 req/sec rate limit
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\nGeocoded: ${ok} / ${targets.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
