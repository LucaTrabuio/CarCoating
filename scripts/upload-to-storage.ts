/**
 * Upload downloaded case images to Firebase Storage and update Firestore URLs.
 *
 * Prerequisites:
 * 1. Enable Firebase Storage in the Firebase Console
 * 2. Run download-case-images.ts first to download images locally
 *
 * Run: npx tsx --env-file=.env.local scripts/upload-to-storage.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Domain → store IDs (same as update-case-images.ts)
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

const BUCKET_NAME = 'keeper-pro-shop.firebasestorage.app';
const DOWNLOAD_DIR = join(import.meta.dirname || __dirname, '..', 'downloaded-case-images');

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: BUCKET_NAME,
    });
  }

  const bucket = getStorage().bucket();
  const db = getFirestore();

  // Verify bucket exists
  try {
    await bucket.getFiles({ maxResults: 1 });
    console.log(`Bucket ${BUCKET_NAME} is accessible.\n`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`ERROR: Cannot access bucket ${BUCKET_NAME}.`);
    console.error(`Enable Firebase Storage at: https://console.firebase.google.com/project/keeper-pro-shop/storage`);
    console.error(msg);
    process.exit(1);
  }

  // Read manifest
  const manifestPath = join(DOWNLOAD_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('No manifest found. Run download-case-images.ts first.');
    process.exit(1);
  }
  const manifest: Record<string, { url: string; localPath: string; filename: string }[]> = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  let uploaded = 0;
  let storesUpdated = 0;
  let failed = 0;

  for (const [domain, images] of Object.entries(manifest)) {
    if (images.length === 0) continue;
    const storeIds = DOMAIN_TO_STORES[domain];
    if (!storeIds) continue;

    console.log(`${domain} (${images.length} images → ${storeIds.length} stores)`);

    const storageUrls: string[] = [];

    for (const img of images) {
      const localFile = join(DOWNLOAD_DIR, img.localPath);
      if (!existsSync(localFile)) {
        console.log(`  SKIP (not found): ${img.localPath}`);
        failed++;
        continue;
      }

      const storagePath = `case-images/${domain}/${img.filename}`;
      const ext = img.filename.endsWith('.jpeg') ? 'jpeg' : 'jpg';

      try {
        await bucket.upload(localFile, {
          destination: storagePath,
          metadata: {
            contentType: `image/${ext}`,
            cacheControl: 'public, max-age=31536000',
          },
        });

        // Make publicly accessible
        await bucket.file(storagePath).makePublic();
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${storagePath}`;
        storageUrls.push(publicUrl);
        uploaded++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  FAIL: ${img.filename} - ${msg}`);
        failed++;
      }
    }

    if (storageUrls.length === 0) continue;

    // Update all stores for this domain
    for (const storeId of storeIds) {
      const ref = db.collection('stores').doc(storeId);
      const doc = await ref.get();
      if (!doc.exists) {
        console.log(`  ? ${storeId} not found`);
        continue;
      }

      await ref.update({
        gallery_images: JSON.stringify(storageUrls),
        before_after_url: storageUrls[0],
      });
      console.log(`  ✓ ${storeId}: ${storageUrls.length} images`);
      storesUpdated++;
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${storesUpdated} stores updated, ${failed} failed`);
}

main().catch(err => { console.error(err); process.exit(1); });
