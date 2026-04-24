/**
 * Seed or update the `site_config/defaults` document.
 *
 * Options:
 *   --from-store=<id>   copy a specific store's fields into defaults.values
 *   --dry-run           print the proposed document without writing
 *   --apply             write the document
 *   --key=<k>           only seed this single key (repeatable)
 *
 * When no --from-store is given and defaults values are missing, the script
 * seeds from hardcoded generators (generateDefaultLayout + empty sentinels).
 * Policy is initialized to allowOverride: true for every key (zero behavioural
 * change on deploy).
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DEFAULTABLE_KEYS = [
  'page_layout',
  'banners',
  'promo_banners',
  'staff_members',
  'custom_services',
  'guide_config',
  'appeal_points',
  'certifications',
  'store_news',
  'blur_config',
  'price_overrides',
] as const;
type Key = (typeof DEFAULTABLE_KEYS)[number];

const EMPTY: Record<Key, string> = {
  page_layout: '',
  banners: '[]',
  promo_banners: '[]',
  staff_members: '[]',
  custom_services: '[]',
  guide_config: '{}',
  appeal_points: '[]',
  certifications: '[]',
  store_news: '[]',
  blur_config: '{}',
  price_overrides: '{}',
};

function parseArgs(argv: string[]) {
  const out: { fromStore?: string; dryRun: boolean; apply: boolean; keys: Key[] } = {
    dryRun: false,
    apply: false,
    keys: [],
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--apply') out.apply = true;
    else if (arg.startsWith('--from-store=')) out.fromStore = arg.slice('--from-store='.length);
    else if (arg.startsWith('--key=')) {
      const k = arg.slice('--key='.length) as Key;
      if ((DEFAULTABLE_KEYS as readonly string[]).includes(k)) out.keys.push(k);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.apply) {
    console.error('Error: pass either --dry-run or --apply');
    process.exit(1);
  }

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

  // Load existing defaults to preserve anything not being seeded this run.
  const existing = await db.collection('site_config').doc('defaults').get();
  const current = existing.exists ? (existing.data() || {}) : {};
  const currentValues = (current.values || {}) as Record<string, string>;
  const currentPolicy = (current.policy || {}) as Record<string, { allowOverride: boolean }>;

  // Determine source of values.
  const values: Record<string, string> = { ...currentValues };
  const keysToSeed: Key[] = args.keys.length > 0 ? args.keys : [...DEFAULTABLE_KEYS];

  if (args.fromStore) {
    const storeDoc = await db.collection('stores').doc(args.fromStore).get();
    if (!storeDoc.exists) {
      console.error(`Store ${args.fromStore} not found`);
      process.exit(1);
    }
    const storeData = storeDoc.data() || {};
    for (const key of keysToSeed) {
      const v = storeData[key];
      if (typeof v === 'string' && v !== '' && v !== '[]' && v !== '{}') {
        values[key] = v;
      } else if (values[key] === undefined) {
        values[key] = EMPTY[key];
      }
    }
  } else {
    for (const key of keysToSeed) {
      if (values[key] === undefined) values[key] = EMPTY[key];
    }
  }

  // Initialize policy: preserve existing, default every key to allowOverride: true.
  const policy: Record<string, { allowOverride: boolean }> = { ...currentPolicy };
  for (const key of DEFAULTABLE_KEYS) {
    if (!policy[key]) policy[key] = { allowOverride: true };
  }

  const nextDoc = {
    version: 1,
    values,
    policy,
    updated_at: new Date().toISOString(),
    updated_by: 'seed-global-defaults',
  };

  console.log('Proposed site_config/defaults:');
  console.log(JSON.stringify({
    valueKeys: Object.keys(values).map(k => `${k}: ${(values[k] || '').length} chars`),
    policy,
  }, null, 2));

  if (args.dryRun) {
    console.log('\n--dry-run: not writing');
    return;
  }
  await db.collection('site_config').doc('defaults').set(nextDoc, { merge: true });
  console.log('\n✓ Wrote site_config/defaults');
}

main().catch(err => { console.error(err); process.exit(1); });
