/**
 * Update stores with construction case images from franchise sites.
 * Saves image URLs to gallery_images and before_after_url fields.
 *
 * Run: npx tsx --env-file=.env.local scripts/update-case-images.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Domain → array of { url, storeIds[] }
// Each domain's images are shared across all stores on that site
const DOMAIN_IMAGES: Record<string, string[]> = {
  'eniwa-coating.com': ['https://eniwa-coating.com/img/jirei/202212051218062.jpg', 'https://eniwa-coating.com/img/jirei/202212121430362.jpg', 'https://eniwa-coating.com/img/jirei/202212051217122.jpg'],
  'sapporo-coating.com': ['https://sapporo-coating.com/img/jirei/202205101511142.jpg', 'https://sapporo-coating.com/img/jirei/202306120532152.jpg', 'https://sapporo-coating.com/img/jirei/202306120521342.jpg'],
  'asahikawa-coating.com': ['https://asahikawa-coating.com/img/jirei/202306081504112.jpg', 'https://asahikawa-coating.com/img/jirei/202306081503172.jpg', 'https://asahikawa-coating.com/img/jirei/202107080015502.jpg'],
  'sendai-iwanuma-coating.com': ['https://sendai-iwanuma-coating.com/img/jirei/202604021402512.jpg', 'https://sendai-iwanuma-coating.com/img/jirei/202604021609382.jpg', 'https://sendai-iwanuma-coating.com/img/jirei/202409291343472.jpg'],
  'morioka-coating.com': ['https://morioka-coating.com/img/jirei/202505230937132.jpg', 'https://morioka-coating.com/img/jirei/202505230939082.jpg', 'https://morioka-coating.com/img/jirei/202505230946582.jpg'],
  'akita-coating.com': ['https://akita-coating.com/img/jirei/202601191114212.jpg', 'https://akita-coating.com/img/jirei/202601191117372.jpg', 'https://akita-coating.com/img/jirei/202505221322262.jpg'],
  'sakata-coating.com': ['https://sakata-coating.com/img/jirei/202505231128132.jpg', 'https://sakata-coating.com/img/jirei/202505231130102.jpg', 'https://sakata-coating.com/img/jirei/202505231137082.jpg'],
  'ashikaga-coating.com': ['https://ashikaga-coating.com/img/jirei/202603231641242.jpg', 'https://ashikaga-coating.com/img/jirei/202603231544522.jpg', 'https://ashikaga-coating.com/img/jirei/202603231613572.jpg'],
  'saitama-nishiomiya-coating.com': ['https://saitama-nishiomiya-coating.com/img/jirei/202304111751392.jpg', 'https://saitama-nishiomiya-coating.com/img/jirei/202304111754062.jpg', 'https://saitama-nishiomiya-coating.com/img/jirei/202304111757442.jpg'],
  'hanyuu-coating.com': ['https://hanyuu-coating.com/img/jirei/202409121716142.jpg', 'https://hanyuu-coating.com/img/jirei/202409121714062.jpg', 'https://hanyuu-coating.com/img/jirei/202409121712502.jpg'],
  'utsunomiya-coating.com': ['https://utsunomiya-coating.com/img/jirei/202409121822152.jpg', 'https://utsunomiya-coating.com/img/jirei/202409121820302.jpg', 'https://utsunomiya-coating.com/img/jirei/202409121814252.jpg'],
  'takasaki-maebashi-coating.com': ['https://takasaki-maebashi-coating.com/img/jirei/202407010945552.jpg', 'https://takasaki-maebashi-coating.com/img/jirei/202407010943492.jpg', 'https://takasaki-maebashi-coating.com/img/jirei/202407011004232.jpg'],
  'ichihara-coating.com': ['https://ichihara-coating.com/img/jirei/202305301003082.jpg', 'https://ichihara-coating.com/img/jirei/202305301002182.jpg', 'https://ichihara-coating.com/img/jirei/202305301001362.jpg'],
  'tsukuba-coating.com': ['https://tsukuba-coating.com/img/jirei/202501171930382.jpg', 'https://tsukuba-coating.com/img/jirei/202501172005212.jpg', 'https://tsukuba-coating.com/img/jirei/202501171935502.jpg'],
  'yachiyo-hanamigawa-coating.com': ['https://yachiyo-hanamigawa-coating.com/img/jirei/202312020932012.jpg', 'https://yachiyo-hanamigawa-coating.com/img/jirei/202312020932102.jpg', 'https://yachiyo-hanamigawa-coating.com/img/jirei/202312020932412.jpg'],
  'narita-coating.com': ['https://narita-coating.com/img/jirei/202508221427032.jpg', 'https://narita-coating.com/img/jirei/202508221427452.jpg', 'https://narita-coating.com/img/jirei/202508221423292.jpg'],
  'fussa-coating.com': ['https://fussa-coating.com/img/jirei/202303221748382.jpg', 'https://fussa-coating.com/img/jirei/202010281128072.jpg', 'https://fussa-coating.com/img/jirei/202303221533072.jpg'],
  'kawasaki-machida-coating.com': ['https://kawasaki-machida-coating.com/img/jirei/202305091456292.jpg', 'https://kawasaki-machida-coating.com/img/jirei/202305091528212.jpg', 'https://kawasaki-machida-coating.com/img/jirei/202305091535122.jpg'],
  'yokosuka-coating.com': ['https://yokosuka-coating.com/img/jirei/202507251349122.jpg', 'https://yokosuka-coating.com/img/jirei/202507251350332.jpg', 'https://yokosuka-coating.com/img/jirei/202305101540012.jpg'],
  'coating-yokohama.com': ['https://coating-yokohama.com/img/jirei/202603051645042.jpeg', 'https://coating-yokohama.com/img/jirei/202603031747032.jpeg', 'https://coating-yokohama.com/img/jirei/202603021611462.jpeg'],
  'coating-nagoyashi.com': ['https://coating-nagoyashi.com/img/jirei/202401161040102.jpg', 'https://coating-nagoyashi.com/img/jirei/202401161009342.jpg', 'https://coating-nagoyashi.com/img/jirei/202401161006392.jpg'],
  'toukai-toyoake-coating.com': ['https://toukai-toyoake-coating.com/img/jirei/201801191601072.jpg', 'https://toukai-toyoake-coating.com/img/jirei/201801181332452.jpg', 'https://toukai-toyoake-coating.com/img/jirei/201801181343022.jpg'],
  'toyota-coating.com': ['https://toyota-coating.com/img/jirei/202304111459382.jpg', 'https://toyota-coating.com/img/jirei/202304111501222.jpg', 'https://toyota-coating.com/img/jirei/202304111503232.jpg'],
  'ichinomiya-hashima-coating.com': ['https://ichinomiya-hashima-coating.com/img/jirei/202304111655032.jpg', 'https://ichinomiya-hashima-coating.com/img/jirei/202304111657012.jpg', 'https://ichinomiya-hashima-coating.com/img/jirei/202304111659402.jpg'],
  'kasugai-coating.com': ['https://kasugai-coating.com/img/jirei/202502281533402.jpg', 'https://kasugai-coating.com/img/jirei/202502281530382.jpg', 'https://kasugai-coating.com/img/jirei/202502281528202.jpg'],
  'kanazawa-coating.com': ['https://kanazawa-coating.com/img/jirei/202601061414522.jpg', 'https://kanazawa-coating.com/img/jirei/202601061418192.jpg', 'https://kanazawa-coating.com/img/jirei/202304111409262.jpg'],
  'yokkaichi-coating.com': ['https://yokkaichi-coating.com/img/jirei/202304111604292.jpg', 'https://yokkaichi-coating.com/img/jirei/202304111604462.jpg', 'https://yokkaichi-coating.com/img/jirei/202304111605502.jpg'],
  'takatsuki-coating.com': ['https://takatsuki-coating.com/img/jirei/202512091228152.jpg', 'https://takatsuki-coating.com/img/jirei/202512081903412.jpg', 'https://takatsuki-coating.com/img/jirei/202512081924392.jpg'],
  'nawate-coating.com': ['https://nawate-coating.com/img/jirei/202507251418182.jpg', 'https://nawate-coating.com/img/jirei/202505271013142.jpg', 'https://nawate-coating.com/img/jirei/202505271015012.jpg'],
  'otake-coating.com': ['https://otake-coating.com/img/jirei/202209060858252.jpg', 'https://otake-coating.com/img/jirei/202209060859492.jpg', 'https://otake-coating.com/img/jirei/202209060900442.jpg'],
  'okayama-coating.com': ['https://okayama-coating.com/img/jirei/202110271735222.jpg', 'https://okayama-coating.com/img/jirei/202110271737572.jpg', 'https://okayama-coating.com/img/jirei/202110271736402.jpg'],
  'coating-hiroshima.com': ['https://coating-hiroshima.com/img/jirei/202601201718412.jpg', 'https://coating-hiroshima.com/img/jirei/202601201718542.jpg', 'https://coating-hiroshima.com/img/jirei/202601201719072.jpg'],
  'izumo-coating.com': ['https://izumo-coating.com/img/jirei/202409121406112.jpg', 'https://izumo-coating.com/img/jirei/202409121415212.jpg', 'https://izumo-coating.com/img/jirei/202409121417202.jpg'],
  'tottorishi-coating.com': ['https://tottorishi-coating.com/img/jirei/202406171253472.jpg', 'https://tottorishi-coating.com/img/jirei/202406171257512.jpg', 'https://tottorishi-coating.com/img/jirei/202405270853092.jpg'],
  'miki-coating.com': ['https://miki-coating.com/img/jirei/202209051804512.jpg', 'https://miki-coating.com/img/jirei/202209051806512.jpg', 'https://miki-coating.com/img/jirei/202209051817282.jpg'],
  'kobe-himeji-coating.com': ['https://kobe-himeji-coating.com/img/jirei/202406191140022.jpg', 'https://kobe-himeji-coating.com/img/jirei/202406191138312.jpg', 'https://kobe-himeji-coating.com/img/jirei/202312061047452.jpg'],
  'kobe-coating.com': ['https://kobe-coating.com/img/jirei/202410031301352.jpg', 'https://kobe-coating.com/img/jirei/201603101841532.jpg', 'https://kobe-coating.com/img/jirei/201603101903322.jpg'],
  'takamatsu-coating.com': ['https://takamatsu-coating.com/img/jirei/202306061645272.jpg', 'https://takamatsu-coating.com/img/jirei/202306061641492.jpg', 'https://takamatsu-coating.com/img/jirei/202007281705402.jpg'],
  'kochi-coating.com': ['https://kochi-coating.com/img/jirei/202210211309592.jpg', 'https://kochi-coating.com/img/jirei/202210211149352.jpg', 'https://kochi-coating.com/img/jirei/202210211313142.jpg'],
  'tokushima-coating.com': ['https://tokushima-coating.com/img/jirei/202211121900052.jpg', 'https://tokushima-coating.com/img/jirei/202207292021152.jpg', 'https://tokushima-coating.com/img/jirei/202207051225182.jpg'],
  'niihama-coating.com': ['https://niihama-coating.com/img/jirei/202006291626002.jpg', 'https://niihama-coating.com/img/jirei/202006291627092.jpg', 'https://niihama-coating.com/img/jirei/202306081417312.jpg'],
  'coating-shimonoseki.com': ['https://coating-shimonoseki.com/img/jirei/202204080133052.jpg', 'https://coating-shimonoseki.com/img/jirei/202204080133342.jpg', 'https://coating-shimonoseki.com/img/jirei/202204080133552.jpg'],
  'kumamoto-coating.com': ['https://kumamoto-coating.com/img/jirei/202410041013002.jpg', 'https://kumamoto-coating.com/img/jirei/202507091414312.jpg', 'https://kumamoto-coating.com/img/jirei/202507091416322.jpg'],
  'fukuoka-sasebo-coating.com': ['https://fukuoka-sasebo-coating.com/img/jirei/202308171229282.jpg', 'https://fukuoka-sasebo-coating.com/img/jirei/202308171111472.jpg', 'https://fukuoka-sasebo-coating.com/img/jirei/202105271649222.jpg'],
  'sasebo-coating.com': ['https://sasebo-coating.com/img/jirei/202410071013322.jpg', 'https://sasebo-coating.com/img/jirei/202507091231382.jpg', 'https://sasebo-coating.com/img/jirei/202507091232462.jpg'],
  'kitakyushu-coating.com': ['https://kitakyushu-coating.com/img/jirei/202409191057062.jpg', 'https://kitakyushu-coating.com/img/jirei/202507081748432.jpg', 'https://kitakyushu-coating.com/img/jirei/202507081750342.jpg'],
  'ogawamachi-fukaya-coating.com': ['https://ogawamachi-fukaya-coating.com/img/jirei/202304111718032.jpg'],
  'sayama-kawagoe-coating.com': ['https://sayama-kawagoe-coating.com/img/jirei/202304111741132.jpg'],
};

// Domain → store IDs mapping
const DOMAIN_TO_STORES: Record<string, string[]> = {
  'eniwa-coating.com': ['eniwa'],
  'sapporo-coating.com': ['sapporo-sattsunae', 'sapporo-yonnana', 'sapporo-honten', 'sapporo-mikasa', 'sapporo-minami', 'sapporo-nishino'],
  'asahikawa-coating.com': ['asahikawa-chuwa'],
  'sendai-iwanuma-coating.com': ['sendai-ichibancho', 'sendai-new-izumi', 'natori-kita', 'asuto-nagamachi'],
  'morioka-coating.com': ['morioka-aeon-mae', 'morioka-bypass'],
  'akita-coating.com': ['akita-joyful-rinkai'],
  'sakata-coating.com': ['sakata-mizuho'],
  'ogawamachi-fukaya-coating.com': ['ogawamachi', 'fukaya'],
  'sayama-kawagoe-coating.com': ['sayamadai', 'kawagoe-inter'],
  'ashikaga-coating.com': ['ashikaga-tobu-ekimae', 'ashikaga-west'],
  'saitama-nishiomiya-coating.com': ['nishi-omiya', 'mitsuhashi'],
  'hanyuu-coating.com': ['hanyu-higashi'],
  'utsunomiya-coating.com': ['utsunomiya-tsuruta', 'utsunomiya-technopolis'],
  'takasaki-maebashi-coating.com': ['takasaki-iizuka', 'maebashi-bunkyo'],
  'ichihara-coating.com': ['ichihara-anesaki', 'ichihara-aobadai', 'chiharadai', 'futabadai'],
  'tsukuba-coating.com': ['tsukuba-miraihira'],
  'yachiyo-hanamigawa-coating.com': ['hanamigawa'],
  'narita-coating.com': ['narita-misatodai'],
  'fussa-coating.com': ['hachioji-sanda', 'fussa', 'musashimurayama-ominami'],
  'kawasaki-machida-coating.com': ['machida-naruse', 'machida-morino'],
  'yokosuka-coating.com': ['yokosuka', 'hayama'],
  'coating-yokohama.com': ['yokohama-base'],
  'coating-nagoyashi.com': ['nagoya-meito', 'nagoya-issha', 'nagoya-arako', 'nagoya-apollo-dome', 'nagoya-tenpaku-shimada', 'nagoya-nyoi'],
  'toukai-toyoake-coating.com': ['toyoake-shinsakae', 'chiryu', 'kariya'],
  'toyota-coating.com': ['toyota-riverside'],
  'awaza-namba-coating.com': ['cardock-nishinari'],
  'ichinomiya-hashima-coating.com': ['kiyosu-kojo'],
  'kasugai-coating.com': ['kasugai-kozoji', 'inuyama'],
  'kanazawa-coating.com': ['kanazawa-izumihonmachi', 'kanazawa-okyozuka', 'kanazawa-minami'],
  'yokkaichi-coating.com': ['yokkaichi', 'yokkaichi-kubota', 'yokkaichi-milkroad'],
  'takatsuki-coating.com': ['takatsuki-iozumi'],
  'nawate-coating.com': ['neyagawa-higashikori'],
  'otake-coating.com': ['otake'],
  'okayama-coating.com': ['okayama-ezaki', 'okayama-takebe'],
  'coating-hiroshima.com': ['hiroshima-midorii', 'hiroshima-shokubutsuen'],
  'izumo-coating.com': ['izumo-hamayamadori'],
  'tottorishi-coating.com': ['yonago-kaibancho'],
  'miki-coating.com': ['miki-kobayashi', 'miki-aoyama'],
  'kobe-himeji-coating.com': ['himeji-yumedai', 'himeji-carwash'],
  'kobe-coating.com': ['kobe-shinkaichi', 'kobe-kitamachi'],
  'takamatsu-coating.com': ['takamatsu-kukodori'],
  'kochi-coating.com': ['kochi-harimaya', 'kochi-nakamura'],
  'tokushima-coating.com': ['tokushima-nakasu'],
  'niihama-coating.com': ['niihama-aeon'],
  'coating-shimonoseki.com': ['shimonoseki-yasuoka', 'shimonoseki-sanbyakume'],
  'kumamoto-coating.com': ['kumamoto-sakuragi', 'kumamoto-otsu', 'kumamoto-motoyama'],
  'fukuoka-sasebo-coating.com': ['fukuoka-nishi-nagasumi'],
  'sasebo-coating.com': ['sasebo'],
  'kitakyushu-coating.com': ['kitakyushu-momozono'],
  'sanin-coating.com': ['tottori-johoku', 'matsue-oba'],
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

  for (const [domain, images] of Object.entries(DOMAIN_IMAGES)) {
    if (images.length === 0) continue;
    const storeIds = DOMAIN_TO_STORES[domain];
    if (!storeIds) { console.log(`  ? ${domain} — no store mapping`); continue; }

    for (const storeId of storeIds) {
      const ref = db.collection('stores').doc(storeId);
      const doc = await ref.get();
      if (!doc.exists) { console.log(`  ? ${storeId} — not found`); continue; }

      const current = doc.data()?.gallery_images;
      if (current && current !== '[]' && current.length > 5) {
        skipped++;
        continue; // already has gallery images
      }

      await ref.update({
        gallery_images: JSON.stringify(images),
        before_after_url: images[0], // first image as featured
      });
      console.log(`  ✓ ${storeId}: ${images.length} images from ${domain}`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} stores updated, ${skipped} already had images`);
}

main().catch(err => { console.error(err); process.exit(1); });
