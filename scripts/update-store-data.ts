import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface Update {
  tel?: string;
  address?: string;
  postalCode?: string;
}

// Confirmed from sapporo-coating.com/map_yutai.html
// + ichihara-coating.com/map_yutai.html (where applicable)
// + scraped-store-info.json (for hanamigawa and tottori-johoku)
const UPDATES: Record<string, Update> = {
  'sapporo-honten': {
    tel: '0800-812-8202',
    address: '北海道札幌市中央区北３条東２丁目２－３８',
    postalCode: '060-0033',
  },
  'sapporo-mikasa': {
    tel: '0800-812-7933',
    address: '北海道三笠市幸町５',
    postalCode: '068-2153',
  },
  'sapporo-minami': {
    tel: '0800-832-5997',
    address: '北海道札幌市中央区南１６条西１１－３－１',
    postalCode: '064-0916',
  },
  'sapporo-sattsunae': {
    tel: '0800-832-6054',
    address: '北海道札幌市東区東苗穂３条２－４－２０',
    postalCode: '007-0803',
  },
  'sapporo-yonnana': {
    tel: '0800-832-5940',
    address: '北海道札幌市東区北四十七条東７丁目824',
    postalCode: '007-0847',
  },
  'hanamigawa': {
    // tel missing from source
    address: '千葉県千葉市花見川区柏井町1598-1',
    postalCode: '262-0041',
  },
  'tottori-johoku': {
    tel: '0800-812-7920',
    address: '鳥取県鳥取市西品治829-13',
    postalCode: '680-0811',
  },
};

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

  let updated = 0;
  let skipped = 0;

  for (const [storeId, update] of Object.entries(UPDATES)) {
    const ref = db.collection('stores').doc(storeId);
    const doc = await ref.get();
    if (!doc.exists) {
      console.log(`✗ ${storeId}: NOT FOUND`);
      skipped++;
      continue;
    }
    const current = doc.data() || {};
    const patch: Record<string, string> = {};
    if (update.tel && !current.tel) patch.tel = update.tel;
    if (update.address && !current.address) patch.address = update.address;
    if (update.postalCode && !current.postal_code) patch.postal_code = update.postalCode;

    if (Object.keys(patch).length === 0) {
      console.log(`- ${storeId}: already has required data`);
      skipped++;
      continue;
    }

    await ref.update(patch);
    const keys = Object.keys(patch).join(', ');
    console.log(`✓ ${storeId}: set ${keys}`);
    updated++;
  }

  console.log(`\nUpdated: ${updated} / ${Object.keys(UPDATES).length} stores`);
  if (skipped > 0) console.log(`Skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
