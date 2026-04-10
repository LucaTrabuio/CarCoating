/**
 * Per-store guide page customization.
 *
 * Stored as a JSON string in `V3StoreData.guide_config`.
 * Read by /[slug]/guide/page.tsx to apply per-store overrides
 * on top of the default coating tier data.
 */

import type { CoatingTier } from './types';

export interface TierTextOverride {
  name?: string;
  tagline?: string;
  description?: string;
  key_differentiator?: string;
}

export interface GuideConfig {
  hide_prices?: boolean;
  tier_overrides?: Record<string, TierTextOverride>;
}

export function parseGuideConfig(json?: string): GuideConfig {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as GuideConfig;
  } catch {
    return {};
  }
}

/**
 * Apply per-store text overrides on top of a tier.
 * Returns a new object — never mutates the input tier.
 */
export function applyTierOverride(tier: CoatingTier, override?: TierTextOverride): CoatingTier {
  if (!override) return tier;
  return {
    ...tier,
    name: override.name || tier.name,
    tagline: override.tagline || tier.tagline,
    description: override.description || tier.description,
    key_differentiator: override.key_differentiator || tier.key_differentiator,
  };
}

/** Return the full tier list with per-store overrides applied. */
export function getCustomizedTiers(config: GuideConfig, baseTiers: CoatingTier[]): CoatingTier[] {
  const overrides = config.tier_overrides || {};
  return baseTiers.map(tier => applyTierOverride(tier, overrides[tier.id]));
}
