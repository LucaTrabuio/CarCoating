/**
 * Banner presets — server-side helpers (Firestore CRUD).
 *
 * Client components should import from `./banner-presets-shared` instead —
 * this file imports firebase-admin.
 */

import { getAdminDb } from './firebase-admin';
import type { SessionUser } from './auth';
import {
  canSeePreset,
  canWritePreset,
  normalizePreset,
  presetToBanner,
  type BannerPreset,
  type BannerPresetHtml,
  type BannerPresetStructured,
  type PresetMode,
  type PresetScope,
  type VisibilityUser,
} from './banner-presets-shared';

// Re-export the client-safe surface so callers can keep importing from this module.
export { canSeePreset, canWritePreset, normalizePreset, presetToBanner };
export type {
  BannerPreset,
  BannerPresetHtml,
  BannerPresetStructured,
  PresetMode,
  PresetScope,
  VisibilityUser,
};

const COLLECTION = 'banner_presets';

// ─── CRUD ────────────────────────────────────────────────

export async function listVisiblePresets(user: SessionUser): Promise<BannerPreset[]> {
  const snapshot = await getAdminDb().collection(COLLECTION).get();
  const all = snapshot.docs.map(d => normalizePreset(d.data(), d.id));
  return all.filter(p => canSeePreset(user, p));
}

export async function getPreset(id: string): Promise<BannerPreset | null> {
  const doc = await getAdminDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizePreset(doc.data() || {}, doc.id);
}

export async function createPreset(
  input: Omit<BannerPreset, 'created_at' | 'updated_at'>,
): Promise<void> {
  const now = new Date().toISOString();
  const doc: BannerPreset = { ...input, created_at: now, updated_at: now };
  await getAdminDb().collection(COLLECTION).doc(input.id).set(doc);
}

export async function updatePreset(id: string, patch: Partial<BannerPreset>, uid: string): Promise<void> {
  const body = {
    ...patch,
    updated_at: new Date().toISOString(),
    updated_by: uid,
  };
  delete (body as Record<string, unknown>).id;
  delete (body as Record<string, unknown>).created_at;
  delete (body as Record<string, unknown>).created_by;
  await getAdminDb().collection(COLLECTION).doc(id).set(body, { merge: true });
}

export async function deletePreset(id: string): Promise<void> {
  await getAdminDb().collection(COLLECTION).doc(id).delete();
}
