/**
 * Backfill `override_flags` on every store, based on which defaultable fields
 * they currently have populated. The safe default: every non-empty field is
 * treated as an explicit override, so existing customization survives future
 * changes to the global defaults.
 *
 * Options:
 *   --dry-run    print the proposed flags per store without writing
 *   --apply      write the flags
 *   --store=<id> limit to a single store (repeatable)
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

function isNonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v !== 'string') return false;
  const trimmed = v.trim();
  return trimmed !== '' && trimmed !== '[]' && trimmed !== '{}';
}

function parseArgs(argv: string[]) {
  const out: { dryRun: boolean; apply: boolean; stores: string[] } = {
    dryRun: false,
    apply: false,
    stores: [],
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--apply') out.apply = true;
    else if (arg.startsWith('--store=')) out.stores.push(arg.slice('--store='.length));
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

  const snapshot = args.stores.length > 0
    ? { docs: await Promise.all(args.stores.map(id => db.collection('stores').doc(id).get())), size: args.stores.length }
    : await db.collection('stores').get();

  const docs = Array.isArray((snapshot as { docs: unknown[] }).docs)
    ? (snapshot as { docs: FirebaseFirestore.DocumentSnapshot[] }).docs
    : [];

  let affected = 0;
  let unchanged = 0;
  let written = 0;

  for (const doc of docs) {
    if (!doc.exists) continue;
    const data = doc.data() || {};
    const flags: Partial<Record<Key, true>> = {};
    for (const key of DEFAULTABLE_KEYS) {
      if (isNonEmpty(data[key])) flags[key] = true;
    }
    const nextRaw = JSON.stringify(flags);
    const existingRaw = typeof data.override_flags === 'string' ? data.override_flags : '{}';
    if (nextRaw === existingRaw) {
      unchanged++;
      continue;
    }
    affected++;
    console.log(`[${doc.id}] ${existingRaw} -> ${nextRaw}`);
    if (args.apply) {
      await doc.ref.set({ override_flags: nextRaw }, { merge: true });
      written++;
    }
  }

  console.log(`\nSummary: affected=${affected} unchanged=${unchanged} written=${written}`);
  if (args.dryRun) console.log('--dry-run: no writes performed');
}

main().catch(err => { console.error(err); process.exit(1); });
