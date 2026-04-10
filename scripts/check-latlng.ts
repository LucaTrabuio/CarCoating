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

  // Stores we just added addresses for
  const updatedIds = [
    'sapporo-honten', 'sapporo-mikasa', 'sapporo-minami', 'sapporo-sattsunae', 'sapporo-yonnana',
    'tottori-johoku', 'yokohama-base',
    'sapporo-nishino', 'kitakami-ic', 'oshu-sakurakawa', 'futabadai', 'ichihara-aobadai',
    'cardock-nishinari', 'matsue-oba', 'bunkyo-hongo', 'hachioji-sanda', 'neyagawa-higashikori',
    'hanamigawa',
  ];

  console.log('Stores recently updated — current lat/lng state:\n');
  for (const id of updatedIds) {
    const doc = await db.collection('stores').doc(id).get();
    const d = doc.data() || {};
    const lat = d.lat;
    const lng = d.lng;
    const hasCoords = (typeof lat === 'number' && lat !== 0) || (typeof lat === 'string' && lat !== '' && lat !== '0');
    const flag = hasCoords ? '✓' : '✗';
    console.log(`${flag} ${id.padEnd(25)} lat=${JSON.stringify(lat).padEnd(10)} lng=${JSON.stringify(lng).padEnd(10)} addr=${d.address || '(none)'}`);
  }

  // Also count globally
  const all = await db.collection('stores').get();
  let withCoords = 0;
  let without = 0;
  for (const d of all.docs) {
    const data = d.data();
    const lat = data.lat;
    if ((typeof lat === 'number' && lat !== 0) || (typeof lat === 'string' && lat !== '' && lat !== '0')) withCoords++;
    else without++;
  }
  console.log(`\nGlobal: ${withCoords} with coords / ${without} without / ${all.size} total`);
}

main().catch(err => { console.error(err); process.exit(1); });
