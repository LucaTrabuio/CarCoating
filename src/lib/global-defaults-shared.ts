/**
 * Client-safe exports for the global-defaults subsystem. Split out from
 * src/lib/global-defaults.ts so that client components can import the
 * DefaultableKey list, types, and pure helpers without pulling in
 * firebase-admin transitively.
 */

export const DEFAULTABLE_KEYS = [
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

export type DefaultableKey = (typeof DEFAULTABLE_KEYS)[number];

export interface PolicyEntry {
  allowOverride: boolean;
}

export interface GlobalDefaults {
  version: number;
  updated_at?: string;
  updated_by?: string;
  values: Partial<Record<DefaultableKey, string>>;
  policy: Partial<Record<DefaultableKey, PolicyEntry>>;
}

/** Per-key empty sentinel used when resetting a store's override. */
export const EMPTY_VALUE: Record<DefaultableKey, string> = {
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

export type OverrideFlags = Partial<Record<DefaultableKey, boolean>>;

export function parseOverrideFlags(raw: string | undefined): OverrideFlags {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: OverrideFlags = {};
    for (const key of DEFAULTABLE_KEYS) {
      if (parsed[key] === true) out[key] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeOverrideFlags(flags: OverrideFlags): string {
  const clean: OverrideFlags = {};
  for (const key of DEFAULTABLE_KEYS) {
    if (flags[key] === true) clean[key] = true;
  }
  return JSON.stringify(clean);
}

export function isSectionLocked(key: DefaultableKey, defaults: GlobalDefaults): boolean {
  return defaults.policy[key]?.allowOverride === false;
}

export function withOverrideFlag(
  rawFlags: string | undefined,
  key: DefaultableKey,
  value: boolean,
): string {
  const flags = parseOverrideFlags(rawFlags);
  if (value) flags[key] = true;
  else delete flags[key];
  return serializeOverrideFlags(flags);
}
