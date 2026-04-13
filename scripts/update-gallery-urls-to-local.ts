/**
 * Update Firestore gallery_images URLs from franchise site URLs
 * to local /case-images/ paths served from public/.
 *
 * Run: npx tsx --env-file=.env.local scripts/update-gallery-urls-to-local.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { basename } from 'path';

// Domain → store IDs (same mapping as update-case-images.ts)
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

function franchiseUrlToLocal(url: string): string | null {
  try {
    const u = new URL(url);
    const domain = u.hostname;
    const filename = basename(u.pathname);
    return `/case-images/${domain}/${filename}`;
  } catch {
    return null;
  }
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

  let updated = 0;
  let skipped = 0;
  let noImages = 0;

  for (const [, storeIds] of Object.entries(DOMAIN_TO_STORES)) {
    for (const storeId of storeIds) {
      const ref = db.collection('stores').doc(storeId);
      const doc = await ref.get();
      if (!doc.exists) continue;

      const data = doc.data()!;
      const raw = data.gallery_images;
      if (!raw || raw === '[]') { noImages++; continue; }

      let images: string[];
      try { images = JSON.parse(raw); } catch { noImages++; continue; }
      if (images.length === 0) { noImages++; continue; }

      // Check if already converted (starts with / instead of http)
      if (images[0].startsWith('/')) { skipped++; continue; }

      const localImages = images.map(franchiseUrlToLocal).filter((u): u is string => u !== null);
      if (localImages.length === 0) { skipped++; continue; }

      const updateData: Record<string, string> = {
        gallery_images: JSON.stringify(localImages),
      };
      // Also update before_after_url if it points to a franchise site
      if (data.before_after_url && data.before_after_url.startsWith('http')) {
        const local = franchiseUrlToLocal(data.before_after_url);
        if (local) updateData.before_after_url = local;
      }

      await ref.update(updateData);
      console.log(`  ✓ ${storeId}: ${localImages.length} images → local paths`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} already local, ${noImages} no images`);
}

main().catch(err => { console.error(err); process.exit(1); });
