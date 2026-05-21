/**
 * Promo-banner carousel data — the single source of truth for the banners that
 * appear in a store's promo carousel (PromoBannersBlock) and, by extension, the
 * banners aggregated onto an area hub.
 *
 * A store's carousel always shows these KeePer default banners, each slot
 * overridden by the store's own `promo_banners` ({src,alt}[] JSON) when set.
 */

export interface PromoBannerSlot {
  src: string;
  alt: string;
}

export const DEFAULT_PROMO_BANNERS: PromoBannerSlot[] = [
  { src: '/images/keeper-h1.jpg', alt: 'カーコーティング専門店 KeePer PRO SHOP' },
  { src: '/images/keeper-03.jpg', alt: 'ダイヤⅡキーパー 25%OFF キャンペーン' },
  { src: '/images/keeper-01.jpg', alt: '純水仕上げで最高品質' },
  { src: '/images/keeper-02.jpg', alt: 'コーティング専用ブース完備' },
];

/**
 * The banners actually shown in a store's promo carousel: the KeePer default set,
 * overridden slot-by-slot by the store's `promo_banners` JSON. Always returns the
 * same number of slots as DEFAULT_PROMO_BANNERS. Malformed JSON → defaults only.
 */
export function resolveStoreCarouselBanners(promoBannersJson?: string): PromoBannerSlot[] {
  let custom: { src?: string; alt?: string }[] = [];
  try {
    const parsed = JSON.parse(promoBannersJson || '[]');
    if (Array.isArray(parsed)) custom = parsed;
  } catch {
    /* malformed → defaults only */
  }
  return DEFAULT_PROMO_BANNERS.map((def, i) =>
    custom[i]?.src ? { src: custom[i]!.src!, alt: custom[i]!.alt || def.alt } : def,
  );
}
