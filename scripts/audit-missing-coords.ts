import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// One-off audit: list every store whose lat/lng is missing or zero, so we
// know which stores fail to render on Google Maps (per-store iframe + the
// multi-store SubCompanyStoreMap rely on these). Group by sub-company so
// it's obvious which area-pages will look incomplete.

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

  const all = await db.collection('stores').get();

  type Row = {
    store_id: string;
    store_name: string;
    address: string;
    sub_company_id: string;
    lat: unknown;
    lng: unknown;
  };

  const missing: Row[] = [];
  const present: Row[] = [];

  for (const d of all.docs) {
    const data = d.data() as Record<string, unknown>;
    const lat = data.lat;
    const lng = data.lng;
    const latNum = typeof lat === 'number' ? lat : typeof lat === 'string' ? Number(lat) : NaN;
    const lngNum = typeof lng === 'number' ? lng : typeof lng === 'string' ? Number(lng) : NaN;
    const hasCoords = Number.isFinite(latNum) && latNum !== 0 && Number.isFinite(lngNum) && lngNum !== 0;
    const row: Row = {
      store_id: (data.store_id as string) || d.id,
      store_name: (data.store_name as string) || '(no name)',
      address: (data.address as string) || '(no address)',
      sub_company_id: (data.sub_company_id as string) || '',
      lat,
      lng,
    };
    if (hasCoords) present.push(row);
    else missing.push(row);
  }

  console.log(`Total stores:      ${all.size}`);
  console.log(`With coordinates:  ${present.length}`);
  console.log(`Missing / zero:    ${missing.length}`);
  console.log('');

  if (missing.length === 0) {
    console.log('✓ Every store has valid lat/lng.');
    return;
  }

  // Group missing rows by sub-company for readability.
  const groups = new Map<string, Row[]>();
  for (const r of missing) {
    const key = r.sub_company_id || '(no sub-company)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  // Resolve sub-company names for nicer output.
  const subDocs = await db.collection('subCompanies').get();
  const subNameById = new Map<string, string>();
  for (const s of subDocs.docs) {
    const sd = s.data() as Record<string, unknown>;
    subNameById.set(s.id, (sd.name as string) || s.id);
  }

  console.log('Stores missing lat/lng (grouped by sub-company):');
  console.log('─'.repeat(80));
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [subId, rows] of sortedGroups) {
    const subLabel = subId === '(no sub-company)' ? subId : `${subNameById.get(subId) || '(unknown)'}  [${subId}]`;
    console.log(`\n▶ ${subLabel}  — ${rows.length} store${rows.length > 1 ? 's' : ''}`);
    for (const r of rows) {
      console.log(`    ${r.store_id.padEnd(28)} ${r.store_name.padEnd(28)} ${r.address}`);
    }
  }

  // Plain machine-readable list at the end so it's easy to copy.
  console.log('\n─'.repeat(80));
  console.log('Plain list of store_ids missing coords:');
  console.log(missing.map(r => r.store_id).join(','));
}

main().catch(err => { console.error(err); process.exit(1); });
