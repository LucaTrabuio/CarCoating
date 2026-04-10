import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface Update {
  tel?: string;
  address?: string;
  note?: string;
}

// All from https://www.keepercoating.jp/proshop/ — city-level pages.
// KeePer's official directory doesn't publish 〒 postal codes so only tel+address.
const UPDATES: Record<string, Update> = {
  'sapporo-nishino': {
    tel: '011-669-3622',
    address: '北海道札幌市西区西野5条2丁目11-15',
    note: 'Source: KeePer directory (西野5条SS)',
  },
  'kitakami-ic': {
    tel: '0197-63-5113',
    address: '岩手県北上市北鬼柳19地割28番5',
    note: 'Source: KeePer directory (セルフ北上IC)',
  },
  'oshu-sakurakawa': {
    tel: '0197-22-7005',
    address: '岩手県奥州市水沢佐倉河字後樋25-1',
    note: 'Source: KeePer directory (セルフさくらかわSS)',
  },
  'futabadai': {
    tel: '029-254-0501',
    address: '茨城県水戸市中丸町331-4',
    note: 'Source: KeePer directory (双葉台SS)',
  },
  'ichihara-aobadai': {
    tel: '0436-62-3011',
    address: '千葉県市原市迎田90-12',
    note: 'Source: KeePer directory (市原青葉台SS)',
  },
  'hanamigawa': {
    tel: '043-258-9104',
    // address already written previously
    note: 'Phone from KeePer directory (花見川SS)',
  },
  'cardock-nishinari': {
    tel: '0586-76-4848',
    address: '愛知県一宮市小赤見字石田20-1',
    note: 'Source: KeePer directory (カードック西成SS — in 愛知一宮市, not Osaka)',
  },
  'matsue-oba': {
    tel: '0852-67-2655',
    address: '島根県松江市大庭町1813-1',
    note: 'Source: KeePer directory (カーライフ松江大庭SS)',
  },
  'bunkyo-hongo': {
    tel: '03-3811-4805',
    address: '東京都文京区本郷3-2-10',
    note: 'Source: KeePer directory (セルフ本郷)',
  },
  'hachioji-sanda': {
    tel: '042-664-6562',
    address: '東京都八王子市散田町5-21-13',
    note: 'Source: KeePer directory (散田SS)',
  },
  'neyagawa-higashikori': {
    tel: '072-852-2531',
    address: '大阪府枚方市東香里2-27-1',
    note: 'Source: KeePer directory (出光東香里SS — in 枚方市, not 寝屋川)',
  },
  // sendai-ichibancho is under renovation per sendai-iwanuma-coating.com
  // and not listed on keepercoating.jp/proshop/miyagi/city263 — leave alone.
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

    if (Object.keys(patch).length === 0) {
      console.log(`- ${storeId}: already has required data`);
      skipped++;
      continue;
    }

    await ref.update(patch);
    console.log(`✓ ${storeId}: set ${Object.keys(patch).join(', ')}  [${update.note || ''}]`);
    updated++;
  }

  console.log(`\nUpdated: ${updated} / ${Object.keys(UPDATES).length}`);
  if (skipped > 0) console.log(`Skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
