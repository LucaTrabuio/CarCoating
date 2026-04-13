/**
 * Apply per-store discount rates from the FMC CSV to Firestore.
 *
 * The CSV has per-tier discount percentages. Our system uses a single
 * discount_rate per store. This script takes the most common discount
 * percentage across tiers as the store's discount_rate.
 *
 * Run: npx tsx --env-file=.env.local scripts/apply-discounts-from-csv.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Map CSV store names → Firestore store IDs
const STORE_NAME_TO_ID: Record<string, string> = {
  '恵庭店': 'eniwa',
  '札苗店': 'sapporo-sattsunae',
  'よんなな店': 'sapporo-yonnana',
  'コーティングステーション札幌本店': 'sapporo-honten',
  '三笠店': 'sapporo-mikasa',
  '札幌南店': 'sapporo-minami',
  '西野5条店': 'sapporo-nishino',
  '旭川忠和店': 'asahikawa-chuwa',
  '一番町店': 'sendai-ichibancho',
  '仙台ニュー泉店': 'sendai-new-izumi',
  '名取北店': 'natori-kita',
  'あすと長町店': 'asuto-nagamachi',
  '盛岡イオン前店': 'morioka-aeon-mae',
  '盛岡バイパス店': 'morioka-bypass',
  '北上インターチェンジ店': 'kitakami-ic',
  '奥州さくらかわ店': 'oshu-sakurakawa',
  '秋田ジョイフル臨海店': 'akita-joyful-rinkai',
  '酒田みずほ店': 'sakata-mizuho',
  '小川町店': 'ogawamachi',
  '深谷店': 'fukaya',
  '狭山台店': 'sayamadai',
  '川越インター店': 'kawagoe-inter',
  '東武えきまえ店': 'ashikaga-tobu-ekimae',
  '足利ウエスト店': 'ashikaga-west',
  '西大宮店': 'nishi-omiya',
  '三橋店': 'mitsuhashi',
  '羽生東店': 'hanyu-higashi',
  '鶴田店': 'utsunomiya-tsuruta',
  'テクノポリス店': 'utsunomiya-technopolis',
  '高崎飯塚店': 'takasaki-iizuka',
  '前橋文京店': 'maebashi-bunkyo',
  '姉崎店': 'ichihara-anesaki',
  '青葉台店': 'ichihara-aobadai',
  'ちはら台店': 'chiharadai',
  '双葉台店': 'futabadai',
  'みらい平店': 'tsukuba-miraihira',
  '花見川店': 'hanamigawa',
  '美郷台店': 'narita-misatodai',
  '散田店': 'hachioji-sanda',
  '本郷店': 'bunkyo-hongo',
  '福生店': 'fussa',
  '武蔵村山大南店': 'musashimurayama-ominami',
  '成瀬店': 'machida-naruse',
  '町田森野店': 'machida-morino',
  '横須賀店': 'yokosuka',
  '葉山店': 'hayama',
  '横浜ベース店': 'yokohama-base',
  '名東店': 'nagoya-meito',
  '一社店': 'nagoya-issha',
  '荒子店': 'nagoya-arako',
  'アポロドーム名古屋店': 'nagoya-apollo-dome',
  '天白島田店': 'nagoya-tenpaku-shimada',
  '如意店': 'nagoya-nyoi',
  '豊明新栄店': 'toyoake-shinsakae',
  '知立店': 'chiryu',
  '刈谷店': 'kariya',
  'リバーサイド豊田店': 'toyota-riverside',
  'カードック西成店': 'cardock-nishinari',
  '清須古城店': 'kiyosu-kojo',
  '高蔵寺店': 'kasugai-kozoji',
  '犬山店': 'inuyama',
  '泉本町店': 'kanazawa-izumihonmachi',
  '御経塚店': 'kanazawa-okyozuka',
  '金沢南店': 'kanazawa-minami',
  '久保田店': 'yokkaichi-kubota',
  '四日市店': 'yokkaichi',
  'ミルクロード店': 'yokkaichi-milkroad',
  '高槻五百住店': 'takatsuki-iozumi',
  '寝屋川東香里店': 'neyagawa-higashikori',
  '大竹店': 'otake',
  '岡山江崎店': 'okayama-ezaki',
  'たけべ店': 'okayama-takebe',
  '広島緑井店': 'hiroshima-midorii',
  '植物園店': 'hiroshima-shokubutsuen',
  '城北店': 'tottori-johoku',
  '大庭店': 'matsue-oba',
  '出雲浜山通り店': 'izumo-hamayamadori',
  '角盤町店': 'yonago-kaibancho',
  '三木小林店': 'miki-kobayashi',
  '青山店': 'miki-aoyama',
  '姫路西(夢前台)店': 'himeji-yumedai',
  'カーウォッシュ姫路店': 'himeji-carwash',
  '神戸新開地店': 'kobe-shinkaichi',
  '神戸北町店': 'kobe-kitamachi',
  '高松空港通り店': 'takamatsu-kukodori',
  '高知はりまや店': 'kochi-harimaya',
  '高知中村店': 'kochi-nakamura',
  '徳島中洲店': 'tokushima-nakasu',
  'イオン新居浜店': 'niihama-aeon',
  '安岡店': 'shimonoseki-yasuoka',
  'セルフ三百目店': 'shimonoseki-sanbyakume',
  '桜木店': 'kumamoto-sakuragi',
  '大津店': 'kumamoto-otsu',
  '本山店': 'kumamoto-motoyama',
  '福岡西長住店': 'fukuoka-nishi-nagasumi',
  '佐世保店': 'sasebo',
  '北九州桃園店': 'kitakyushu-momozono',
};

function parsePercent(s: string): number | null {
  if (!s) return null;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
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

  const csv = readFileSync('/Users/lucatrabuio/Desktop/BodyGlassCoating/FMC割引内容　SS一覧/Sheet1-Table 1.csv', 'utf-8');
  const lines = csv.split('\n').slice(4); // skip header rows

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const storeName = cols[2]?.trim();
    if (!storeName) continue;

    const storeId = STORE_NAME_TO_ID[storeName];
    if (!storeId) {
      console.log(`  ? "${storeName}" — no mapping`);
      notFound++;
      continue;
    }

    // Parse discounts: cols 4-10 = Crystal, Fresh, Diamond, W-Diamond, DiaII, ECO+, EX
    const discounts = [4, 5, 6, 7, 8, 9, 10].map(i => parsePercent(cols[i] || '')).filter((d): d is number => d !== null);

    if (discounts.length === 0) {
      console.log(`  - ${storeId} (${storeName}): no numeric discounts found`);
      skipped++;
      continue;
    }

    // Use the most common discount as the store's discount_rate
    const freq = new Map<number, number>();
    discounts.forEach(d => freq.set(d, (freq.get(d) || 0) + 1));
    const bestDiscount = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];

    // Check current value
    const doc = await db.collection('stores').doc(storeId).get();
    const current = doc.data()?.discount_rate;

    if (current === bestDiscount) {
      skipped++;
      continue;
    }

    await db.collection('stores').doc(storeId).update({ discount_rate: bestDiscount });
    console.log(`  ✓ ${storeId}: ${current || 0}% → ${bestDiscount}%`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} unchanged, ${notFound} not mapped`);
}

main().catch(err => { console.error(err); process.exit(1); });
