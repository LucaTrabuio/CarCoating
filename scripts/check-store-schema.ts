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

  // Sample a populated real store (eniwa from CSV row 1)
  const doc = await db.collection('stores').doc('eniwa').get();
  if (!doc.exists) {
    console.log('eniwa not found, trying another');
    return;
  }
  const data = doc.data() || {};
  // Print all non-empty string fields related to URL or website or source
  console.log('Fields that look URL-related:');
  for (const [k, v] of Object.entries(data)) {
    if (/url|website|link|source|site/i.test(k) || (typeof v === 'string' && /^https?:\/\//.test(v))) {
      console.log(`  ${k}: ${JSON.stringify(v).slice(0, 150)}`);
    }
  }
  console.log('\nAll fields (keys only):');
  console.log('  ' + Object.keys(data).sort().join(', '));

  // Also check sub_companies schema
  const subsSnap = await db.collection('sub_companies').limit(3).get();
  console.log('\nSub-company sample fields:');
  for (const sub of subsSnap.docs) {
    const d = sub.data();
    console.log(`\n  ${sub.id}:`);
    for (const [k, v] of Object.entries(d)) {
      if (/url|website|link|source|site/i.test(k) || (typeof v === 'string' && /^https?:\/\//.test(v))) {
        console.log(`    ${k}: ${JSON.stringify(v).slice(0, 150)}`);
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
