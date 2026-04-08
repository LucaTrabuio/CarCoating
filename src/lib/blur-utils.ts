import { parsePageLayout } from './block-types';
import type { PricingConfig } from './block-types';

/**
 * Extract blur_fields from a store's serialized page_layout JSON.
 */
export function getBlurFieldsFromLayout(pageLayout?: string): string[] {
  if (!pageLayout) return [];
  try {
    const layout = parsePageLayout(pageLayout);
    const pricingBlock = layout.blocks.find(b => b.type === 'pricing');
    if (!pricingBlock) return [];
    return (pricingBlock.config as PricingConfig).blur_fields ?? [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific field for a given tier should be blurred.
 * Supports per-tier ('crystal:web_price'), all-tier ('all:web_price'), and legacy ('web_price') formats.
 */
export function isBlurred(tierId: string, field: string, blurFields: string[]): boolean {
  return (
    blurFields.includes(`${tierId}:${field}`) ||
    blurFields.includes(`all:${field}`) ||
    blurFields.includes(field)
  );
}
