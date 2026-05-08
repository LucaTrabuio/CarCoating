/**
 * Global defaults + per-store override policy (server-side helpers).
 *
 * Client components should import client-safe exports from
 * `./global-defaults-shared` instead — this file pulls in firebase-admin.
 *
 * Resolution (per key):
 *   policy.allowOverride === false  → always global default   (locked)
 *   override_flags[key] === true    → store value             (overridden)
 *   otherwise                       → global default          (inheriting)
 */

import { getAdminDb } from './firebase-admin';
import { getV3StoreById } from './firebase-stores';
import type { V3StoreData } from './v3-types';
import {
  DEFAULTABLE_KEYS,
  EMPTY_VALUE,
  isSectionLocked,
  parseOverrideFlags,
  serializeOverrideFlags,
  withOverrideFlag,
  type DefaultableKey,
  type GlobalDefaults,
  type OverrideFlags,
  type PolicyEntry,
} from './global-defaults-shared';

// Re-export the client-safe surface so callers can keep importing from this module.
export {
  DEFAULTABLE_KEYS,
  EMPTY_VALUE,
  isSectionLocked,
  parseOverrideFlags,
  serializeOverrideFlags,
  withOverrideFlag,
};
export type { DefaultableKey, GlobalDefaults, OverrideFlags, PolicyEntry };

const SITE_CONFIG_COLLECTION = 'site_config';
const DEFAULTS_DOC_ID = 'defaults';

const EMPTY_DEFAULTS: GlobalDefaults = {
  version: 1,
  values: {},
  policy: {},
};

// ─── Firestore access ─────────────────────────────────────

export async function getGlobalDefaults(): Promise<GlobalDefaults> {
  try {
    const doc = await getAdminDb()
      .collection(SITE_CONFIG_COLLECTION)
      .doc(DEFAULTS_DOC_ID)
      .get();
    if (!doc.exists) return EMPTY_DEFAULTS;
    const data = doc.data() as Partial<GlobalDefaults> | undefined;
    return {
      version: data?.version ?? 1,
      updated_at: data?.updated_at,
      updated_by: data?.updated_by,
      values: data?.values ?? {},
      policy: data?.policy ?? {},
    };
  } catch (err) {
    console.error('getGlobalDefaults failed, returning empty defaults:', err);
    return EMPTY_DEFAULTS;
  }
}

export async function saveGlobalDefaults(
  patch: { values?: Partial<Record<DefaultableKey, string>>; policy?: Partial<Record<DefaultableKey, PolicyEntry>> },
  uid: string,
): Promise<void> {
  const current = await getGlobalDefaults();
  const next: GlobalDefaults = {
    version: 1,
    values: { ...current.values, ...(patch.values ?? {}) },
    policy: { ...current.policy, ...(patch.policy ?? {}) },
    updated_at: new Date().toISOString(),
    updated_by: uid,
  };
  await getAdminDb()
    .collection(SITE_CONFIG_COLLECTION)
    .doc(DEFAULTS_DOC_ID)
    .set(next, { merge: true });
}

// ─── Resolution ────────────────────────────────────────────

/**
 * Resolve the effective value for a single defaultable section of a store.
 * Returns undefined if neither the store nor the global default has a value.
 */
export function resolveStoreField(
  key: DefaultableKey,
  store: V3StoreData,
  defaults: GlobalDefaults,
  flags: OverrideFlags,
): string | undefined {
  const globalValue = defaults.values[key];
  const storeValue = store[key];

  if (isSectionLocked(key, defaults)) return globalValue ?? storeValue;
  if (flags[key] === true) return storeValue ?? globalValue;
  return globalValue ?? storeValue;
}

/** Fetch a store with all defaultable fields resolved to their effective values. */
export async function getEffectiveStore(storeId: string): Promise<V3StoreData | null> {
  const [store, defaults] = await Promise.all([
    getV3StoreById(storeId),
    getGlobalDefaults(),
  ]);
  if (!store) return null;
  return applyDefaults(store, defaults);
}

/** Overlay global defaults onto an already-loaded store. Pure, for testability. */
export function applyDefaults(store: V3StoreData, defaults: GlobalDefaults): V3StoreData {
  const flags = parseOverrideFlags(store.override_flags);
  const out: V3StoreData = { ...store };
  for (const key of DEFAULTABLE_KEYS) {
    const resolved = resolveStoreField(key, store, defaults, flags);
    if (resolved !== undefined) {
      (out as unknown as Record<string, unknown>)[key] = resolved;
    }
  }
  return out;
}

// ─── Server-only store-side operations ─────────────────────

/** List all stores currently overriding a given section. */
export async function listStoresOverriding(
  key: DefaultableKey,
): Promise<Array<{ store_id: string; store_name: string; updated_at?: string }>> {
  const snapshot = await getAdminDb().collection('stores').get();
  const out: Array<{ store_id: string; store_name: string; updated_at?: string }> = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() as Partial<V3StoreData> & Record<string, unknown>;
    const flags = parseOverrideFlags(data.override_flags as string | undefined);
    if (flags[key] === true) {
      out.push({
        store_id: (data.store_id as string) || doc.id,
        store_name: (data.store_name as string) || doc.id,
        updated_at: (data.updated_at as string | undefined) ?? undefined,
      });
    }
  }
  return out;
}

/**
 * Clear a store's override for a single section: reset field to empty sentinel
 * and drop the flag. Caller is responsible for auth.
 */
export async function resetStoreOverride(
  storeId: string,
  key: DefaultableKey,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection('stores').doc(storeId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`Store ${storeId} not found`);
  const data = doc.data() as Partial<V3StoreData>;
  const nextFlags = withOverrideFlag(data.override_flags, key, false);
  await ref.set(
    {
      [key]: EMPTY_VALUE[key],
      override_flags: nextFlags,
    },
    { merge: true },
  );
}
