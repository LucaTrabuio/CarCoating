import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function nominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=jp&limit=1&accept-language=ja`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'car-coating-store-directory/1.0 (admin@keeper-proshop.local)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
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

  // Force-overwrite cardock-nishinari with the correct Aichi address
  // (previous value was wrong Osaka placeholder data from initial import)
  const correctAddress = '愛知県一宮市小赤見字石田20-1';
  const correctPrefecture = '愛知県';
  const correctCity = '一宮市';

  const before = await db.collection('stores').doc('cardock-nishinari').get();
  console.log('Before:');
  console.log('  address:', before.data()?.address);
  console.log('  prefecture:', before.data()?.prefecture);
  console.log('  city:', before.data()?.city);
  console.log('  lat/lng:', before.data()?.lat, before.data()?.lng);
  console.log('');

  // Try to geocode the correct address, with fallback
  let coords = await nominatim(correctAddress);
  if (!coords) {
    await new Promise(r => setTimeout(r, 1100));
    coords = await nominatim('愛知県一宮市小赤見');
  }
  if (!coords) {
    await new Promise(r => setTimeout(r, 1100));
    coords = await nominatim('愛知県一宮市');
  }

  const patch: Record<string, string | number> = {
    address: correctAddress,
    prefecture: correctPrefecture,
    city: correctCity,
  };
  if (coords) {
    patch.lat = coords.lat;
    patch.lng = coords.lng;
  }

  await db.collection('stores').doc('cardock-nishinari').update(patch);
  console.log('After:', JSON.stringify(patch, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
