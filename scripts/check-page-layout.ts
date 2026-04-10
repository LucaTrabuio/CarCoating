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
  const ids = ['eniwa', 'ashikaga-tobu-ekimae', 'sapporo-honten', 'tokyo-shinjuku', 'yokohama-base'];
  for (const id of ids) {
    const doc = await db.collection('stores').doc(id).get();
    const d = doc.data() || {};
    const pl = d.page_layout;
    const t = typeof pl;
    const len = t === 'string' ? (pl as string).length : t === 'object' ? JSON.stringify(pl).length : 0;
    const preview = (JSON.stringify(pl) || '(undefined)').slice(0, 150);
    console.log(`${id.padEnd(25)} type=${t} length=${len} preview=${preview}`);
  }

  // Also count globally how many have any non-empty page_layout
  const all = await db.collection('stores').get();
  let empty = 0;
  let str = 0;
  let obj = 0;
  let other = 0;
  for (const d of all.docs) {
    const pl = d.data().page_layout;
    if (pl === undefined || pl === null || pl === '' || pl === '{}') empty++;
    else if (typeof pl === 'string') str++;
    else if (typeof pl === 'object') obj++;
    else other++;
  }
  console.log(`\nGlobal: empty=${empty}, string=${str}, object=${obj}, other=${other}, total=${all.size}`);
}

main().catch(err => { console.error(err); process.exit(1); });
