/**
 * Replace every numeric-suffix store slug (`<sc>-<n>` style) with a
 * meaningful romaji slug derived from the store's SS名.
 *
 * Stores already using meaningful slugs (sapporo-honten, akita-joyful-
 * rinkai, bunkyo-hongo, chiharadai, eniwa, …) are left alone — this
 * script only touches the ~80 stores whose current id ends in `-\d+`.
 *
 * Each new slug follows the existing convention:
 *   - When the branch token is unique enough on its own, the slug is
 *     just that token (e.g. yakumo, kameido, anezaki).
 *   - When the branch token would collide with another store or is
 *     too generic, the sub_company id is prepended (e.g.
 *     tachikawa-fuchu-bunbai, adachi-kanshichi).
 *
 * Mechanics — Firestore doc ids are immutable, so each rename is a
 * copy-then-delete cycle (write new, update sub_company.stores arrays,
 * delete old).
 *
 * Idempotent: skips when the source id is missing or the target id
 * already exists.
 *
 * Run: npx dotenv -e .env.local -- npx tsx scripts/rename-numeric-store-slugs.ts [--dry-run]
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { appendFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// from → to. Hand-authored against the slug audit (kuroshiro proposal +
// long-vowel and sokuon fixes). Names checked against each store's SS名.
const RENAMES: Record<string, string> = {
  // asahikawa (3 stores incl. asahikawa-chuwa)
  'asahikawa-2': 'asahikawa-midorigaoka',            // セルフ緑が丘SS
  // kashihara (2 stores; kashihara-1 already renamed to sakurai)
  'kashihara-2': 'kashihara-unate',                  // セルフ橿原 (橿原市雲梯町)
  // adachi-katsushika (sub_company has 2 stores)
  'adachi-katsushika-1': 'adachi-kanshichi',         // 環7亀有SS
  'adachi-katsushika-2': 'adachi-r4',                // 足立R4SS
  // akita (3 stores incl. akita-joyful-rinkai)
  'akita-2': 'honjo-sakae',                          // 本荘栄町SS
  'akita-3': 'honjo-higashi',                        // セルフ本荘東SS
  // ashikaga (3 stores incl. ashikaga-tobu-ekimae, ashikaga-west)
  'ashikaga-3': 'ashikaga-nishikawata',              // セルフ西川田店
  // awaza-namba (4 stores incl. cardock-nishinari)
  'awaza-namba-2': 'gifu-fukuju',                    // セルフ岐阜福寿町
  'awaza-namba-3': 'ichinomiya-higashi',             // セルフ一宮東
  'awaza-namba-4': 'ichinomiya',                     // セルフ一宮
  // fukuoka-sasebo (5 stores incl. fukuoka-nishi-nagasumi)
  'fukuoka-sasebo-2': 'fukuoka-fukushige',           // キーパープロショップ福重店
  'fukuoka-sasebo-3': 'fukuoka-yakuin',              // 薬院SS
  'fukuoka-sasebo-4': 'fukuoka-notame',              // セルフステーション野多目SS
  'fukuoka-sasebo-5': 'fukuoka-wakahisa',            // キーパープロショップ若久
  // fussa (4 stores incl. fussa, hachioji-sanda, musashimurayama-ominami)
  'fussa-4': 'asahigaoka',                           // 旭ヶ丘サービスステーション
  // gifu (4 stores)
  'gifu-1': 'gifu-yabuta',                           // セルフ薮田南
  'gifu-2': 'gifu-meitoku',                          // 明徳町
  'gifu-3': 'gifu-iwata',                            // セルフ岩田
  'gifu-4': 'gifu-masaki',                           // KeePerPROSHOP 正木店
  // hachiouji-fussa (4 stores incl. bunkyo-hongo)
  'hachiouji-fussa-1': 'minato-aoyama',              // キーパープロショップ青山中央SS
  'hachiouji-fussa-2': 'meguro-yakumo',              // 八雲SS
  // higashiosaka (3 stores)
  'higashiosaka-1': 'higashiosaka-inada',            // セルフ稲田東大阪
  'higashiosaka-2': 'higashiosaka-kawachi',          // セルフ河内
  'higashiosaka-3': 'yao',                           // 八尾店
  // hiroshima (4 stores incl. hiroshima-midorii, hiroshima-shokubutsuen)
  'hiroshima-3': 'hiroshima-ishiuchi',               // キーパープロショップ石内バイパス店
  // izumo (2 stores incl. izumo-hamayamadori)
  'izumo-2': 'izumo-idai',                           // パートナー出雲医大通SS
  // kashihara (2 stores)
  'kashihara-1': 'sakurai',                          // セルフ桜井
  // (kashihara-2 stays — it's the canonical kashihara slug)
  // kasugai (3 stores incl. inuyama, kasugai-kozoji)
  'kasugai-3': 'ushimaki',                           // 牛牧
  // kobe-himeji (5 stores incl. himeji-carwash, himeji-keeper-pro, himeji-yumedai)
  'kobe-himeji-3': 'himeji-mitachi',                 // カーフル御立
  'kobe-himeji-4': 'himeji-tenjin',                  // シーサイド姫路天神
  // kochi (3 stores incl. kochi-harimaya, kochi-nakamura)
  'kochi-3': 'kochi-houei',                          // キーパープロショップ宝永町店
  // kumamoto (5 stores incl. kumamoto-motoyama, kumamoto-otsu, kumamoto-sakuragi, shiga-otsu-lakeside)
  'kumamoto-4': 'shiga-ritto',                       // セルフ栗東インター — was wrongly placed in kumamoto sc
  // matsuyama (2 stores)
  'matsuyama-1': 'matsuyama-morimatsu',              // セルフ森松
  'matsuyama-2': 'matsuyama-anjoji',                 // セルフ安城寺
  // morioka (3 stores incl. morioka-aeon-mae, morioka-bypass)
  'morioka-3': 'morioka-kamido',                     // 盛岡上堂
  // morioka-kitakami (3 stores incl. kitakami-ic, oshu-sakurakawa)
  'morioka-kitakami-3': 'mizusawa',                  // 水沢街道
  // nagaokakyo (2 stores)
  'nagaokakyo-1': 'nagaoka-tenjin',                  // セルフ長岡天神SS
  'nagaokakyo-2': 'kumiyama',                        // 久御山
  // nagoyashi (8 stores incl. nagoya-apollo-dome, nagoya-arako, nagoya-issha, nagoya-nyoi, nagoya-tenpaku-shimada)
  'nagoyashi-7': 'komaki-ajioka',                    // セルフ味岡
  'nagoyashi-8': 'fuso',                             // セルフ扶桑
  'nagoyashi-9': 'komaki',                           // セルフ小牧
  // narita (2 stores incl. narita-misatodai)
  'narita-2': 'narita-kozunomori',                   // キーパープロショップ公津の杜
  // osaka-minami (2 stores)
  'osaka-minami-1': 'osaka-shimizugaoka',            // 清水丘店
  'osaka-minami-2': 'osaka-nanko',                   // セルフ南港ポートタウンSS
  // saitama-nishiomiya (3 stores incl. nishi-omiya, mitsuhashi)
  'saitama-nishiomiya-3': 'toda',                    // キーパープロショップ新大宮バイパス戸田店
  // sakai-kishiwada (3 stores)
  'sakai-kishiwada-1': 'kishiwada-shimomatsu',       // 下松店
  'sakai-kishiwada-2': 'kishiwada-kamori',           // 岸和田加守町
  'sakai-kishiwada-3': 'sakai-portas',               // ポルタス堺
  // sakura-yachiyo (3 stores)
  'sakura-yachiyo-1': 'sakura-west',                 // 佐倉ウエストSS
  'sakura-yachiyo-2': 'yachiyodai',                  // メンテセルフ八千代台SS
  'sakura-yachiyo-3': 'sakura-kaburaki',             // キーパープロショップ佐倉かぶらぎSS
  // sanin (5 stores incl. matsue-oba, tottori-johoku)
  'sanin-4': 'tottori-koyama',                       // パートナー湖山サービスショップ
  'sanin-6': 'matsue-nishikawatsu',                  // パートナー松江西川津SS
  'sanin-7': 'matsue-iya',                           // カーライフ揖屋SS
  // sayama-kawagoe (3 stores incl. kawagoe-inter, sayamadai)
  'sayama-kawagoe-3': 'tsurugashima',                // キーパープロショップ　鶴ヶ島若葉店
  // sendai-iwanuma (8 stores incl. asuto-nagamachi, natori-kita, sendai-new-izumi)
  'sendai-iwanuma-10': 'sendai-yumi',                // セルフ弓の町SS
  'sendai-iwanuma-6': 'sendai-asahigaoka',           // セルフ旭ヶ丘SS
  'sendai-iwanuma-7': 'iwanuma-bypass',              // セルフ岩沼バイパスSS
  'sendai-iwanuma-8': 'sendai-sumiyoshi',            // 住吉台SS
  'sendai-iwanuma-9': 'sendai-koizumi',              // パティオ小泉SS
  // tachikawa-fuchu (4 stores)
  'tachikawa-fuchu-1': 'fuchu-bunbai',               // 府中分梅SS
  'tachikawa-fuchu-2': 'chofu-minami',               // セルフ調布南SS
  'tachikawa-fuchu-3': 'koganei-sakura',             // セルフさくら小金井SS
  'tachikawa-fuchu-4': 'tachikawa-minami',           // 立川南SS
  // takasaki-maebashi (4 stores incl. takasaki-iizuka, maebashi-bunkyo)
  'takasaki-maebashi-3': 'takasaki-orui',            // キーパープロショップ　高崎大類店
  'takasaki-maebashi-4': 'takasaki-kannon',          // キーパープロショップ　高崎観音店
  // toukai-toyoake (7 stores incl. chiryu, kariya, toyoake-shinsakae)
  'toukai-toyoake-4': 'nagoya-southern-hibino',      // サザン日比野
  'toukai-toyoake-5': 'tokai',                       // セルフ東海
  'toukai-toyoake-6': 'tokai-shiyakusho',            // セルフ東海市役所前SS
  'toukai-toyoake-7': 'nagoya-hibino',               // 日比野SS
  // tottorishi (4 stores)
  'tottorishi-2': 'yonago-idaimae',                  // カーライフ医大前
  'tottorishi-3': 'yonago-sanyanagi',                // カーライフ三柳SS
  'tottorishi-4': 'hiezu',                           // パートナー日吉津
  // yachiyo-hanamigawa (3 stores incl. hanamigawa)
  'yachiyo-hanamigawa-2': 'chiba-onyu',              // メンテセルフ園生SS
  'yachiyo-hanamigawa-3': 'chiba-kaizuka',           // セルフ貝塚
  // yokkaichi (4 stores incl. yokkaichi, yokkaichi-kubota, yokkaichi-milkroad)
  'yokkaichi-4': 'suzuka',                           // セルフ鈴鹿
  // yokohama (2 stores incl. yokohama-base)
  'yokohama-2': 'yokohama-sugita',                   // セルフ杉田SS
  // kanagawa-isehara (1 store; not numeric but a placeholder)
  'kanagawa-isehara-1': 'isehara-higashidake',       // セルフ東大竹SS
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('[dry-run mode] no writes will be made\n');

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

  const snap = await db.collection('stores').get();
  const allIds = new Set(snap.docs.map(d => d.id));
  const subCoSnap = await db.collection('sub_companies').get();
  const subCoIds = new Set(subCoSnap.docs.map(d => d.id));

  // Pre-flight checks
  const targets = Object.values(RENAMES);
  const dups = targets.filter((t, i) => targets.indexOf(t) !== i);
  if (dups.length > 0) {
    console.error(`Duplicate targets in RENAMES: ${[...new Set(dups)].join(', ')}`);
    process.exit(1);
  }
  for (const [from, to] of Object.entries(RENAMES)) {
    // If the source is missing AND target exists, this rename has already
    // been applied — that's idempotent, skip the collision check.
    if (!allIds.has(from) && allIds.has(to)) continue;
    if (from !== to && allIds.has(to)) {
      console.error(`COLLISION: target "${to}" already exists (rename of "${from}")`);
      process.exit(1);
    }
    if (from !== to && subCoIds.has(to)) {
      console.error(`COLLISION: target "${to}" matches a sub_company id (rename of "${from}")`);
      process.exit(1);
    }
  }

  console.log(`=== STORE SLUG RENAMES (${Object.keys(RENAMES).length}) ===`);
  let renamed = 0;
  for (const [from, to] of Object.entries(RENAMES)) {
    const doc = snap.docs.find(d => d.id === from);
    if (!doc) {
      console.log(`  SKIP ${from} → ${to} — not found`);
      continue;
    }
    const data = doc.data();
    const sc = String(data.sub_company_id ?? '');
    console.log(`  ${from.padEnd(28)} → ${to.padEnd(28)} | sc=${sc} | "${data.store_name}"`);

    if (!dryRun) {
      const newDoc = { ...data, store_id: to, store_slug: to };
      await db.collection('stores').doc(to).set(newDoc);
      await db.collection('stores').doc(from).delete();
      if (sc) {
        await db.collection('sub_companies').doc(sc).update({
          stores: FieldValue.arrayRemove(from),
        });
        await db.collection('sub_companies').doc(sc).update({
          stores: FieldValue.arrayUnion(to),
        });
      }
    }
    renamed++;
  }

  console.log(`\nSummary: ${renamed} renames${dryRun ? ' [dry-run]' : ''}`);

  if (!dryRun) {
    const after = await db.collection('stores').get();
    const numericLeft = after.docs.filter(d => /-\d+$/.test(d.id)).length;
    console.log(`After: ${after.size} stores, ${numericLeft} numeric-suffix ids remaining`);
  }

  // Append summary to MISSING_DATA.md
  const md = [
    '',
    '---',
    '',
    `## Numeric → meaningful slug rename — ${dryRun ? 'dry-run preview' : new Date().toISOString()}`,
    '',
    '| Old id | New id | sub_company_id | store_name |',
    '|---|---|---|---|',
    ...Object.entries(RENAMES).map(([from, to]) => {
      const doc = snap.docs.find(d => d.id === from);
      const sc = String(doc?.data().sub_company_id ?? '');
      const name = String(doc?.data().store_name ?? '');
      return `| \`${from}\` | \`${to}\` | \`${sc}\` | ${name} |`;
    }),
    '',
  ].join('\n');
  const mdPath = resolve(process.cwd(), 'MISSING_DATA.md');
  if (existsSync(mdPath)) appendFileSync(mdPath, md, 'utf-8');
}

main().catch(err => { console.error(err); process.exit(1); });
