import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

  const ids = ['osaka-umeda', 'tokyo-shibuya', 'tokyo-shinjuku'];

  for (const id of ids) {
    const doc = await db.collection('stores').doc(id).get();
    console.log(`\n=== ${id} ===`);
    if (!doc.exists) {
      console.log('(not found)');
      continue;
    }
    const data = doc.data() || {};
    // Print keys that typically contain URLs or source info
    const fields = [
      'store_name', 'store_name_en', 'tel', 'address', 'website', 'website_url',
      'source_url', 'official_url', 'parent_url', 'company_url',
      'sub_company_id', 'sub_company_slug', 'company_id',
      'created_at', 'createdAt', 'imported_from', 'source',
    ];
    for (const k of fields) {
      if (data[k] !== undefined) console.log(`  ${k}: ${JSON.stringify(data[k])}`);
    }
    // Any other non-trivial string fields
    console.log('  (other fields present:)');
    for (const [k, v] of Object.entries(data)) {
      if (fields.includes(k)) continue;
      if (typeof v === 'string' && v.length > 0 && v.length < 200) {
        console.log(`    ${k}: ${JSON.stringify(v)}`);
      }
    }
  }

  // Also look at sub_companies for any reference to these stores
  console.log('\n=== sub_companies referencing these IDs ===');
  const subSnap = await db.collection('sub_companies').get();
  for (const sub of subSnap.docs) {
    const d = sub.data();
    const stores = d.stores || d.store_ids || [];
    const hits = ids.filter(id => Array.isArray(stores) ? stores.includes(id) : stores === id);
    const primary = d.primary_store_id || d.primary_keeper_id || '';
    if (hits.length > 0 || ids.includes(primary)) {
      console.log(`  ${sub.id}: stores=${JSON.stringify(stores)}, primary=${primary}, website=${d.website_url || d.website || '-'}, company_url=${d.company_url || '-'}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
