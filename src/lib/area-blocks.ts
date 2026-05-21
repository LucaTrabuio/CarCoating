import type { CoatingTier } from './types';
import type { Banner } from './block-types';
import { resolveStoreCarouselBanners } from './promo-banners';
import type { ServiceOption } from '@/data/service-options';
import { DEFAULT_SERVICE_OPTIONS } from '@/data/service-options';

export interface AreaBlock {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  order: number;
  config: Record<string, unknown>;
}

/** A reference from an area_banners block to a specific banner in a store. */
export interface AreaBannerRef {
  storeId: string;
  bannerId: string;
}

/** One entry in the banner pool surfaced to the picker. */
export interface AreaBannerSource {
  storeId: string;
  storeName: string;
  bannerId: string;
  banner: Banner;
}

export const AREA_BLOCK_META: Record<string, { labelJa: string; icon: string }> = {
  area_header: { labelJa: 'エリアヘッダー', icon: '🗾' },
  area_banners: { labelJa: 'プロモーションバナー（集約）', icon: '🎨' },
  area_store_map: { labelJa: '店舗マップ', icon: '📍' },
  aggregated_coatings: { labelJa: 'コーティングメニュー（集約）', icon: '✨' },
  aggregated_options: { labelJa: 'オプションメニュー（集約）', icon: '🔧' },
  area_news: { labelJa: 'お知らせ（集約）', icon: '📰' },
  columns: { labelJa: 'コラム・お役立ち情報', icon: '📝' },
};

export const DEFAULT_AREA_BLOCKS: AreaBlock[] = [
  {
    id: 'area-header',
    type: 'area_header',
    label: 'エリアヘッダー',
    visible: true,
    order: 0,
    config: { title: '', subtitle: '' },
  },
  {
    id: 'area-banners',
    type: 'area_banners',
    label: 'プロモーションバナー（集約）',
    visible: true,
    order: 1,
    config: { refs: [] },
  },
  {
    id: 'area-store-map',
    type: 'area_store_map',
    label: '店舗マップ',
    visible: true,
    order: 2,
    config: {},
  },
  {
    id: 'aggregated-coatings',
    type: 'aggregated_coatings',
    label: 'コーティングメニュー（集約）',
    visible: true,
    order: 3,
    config: {},
  },
  {
    id: 'aggregated-options',
    type: 'aggregated_options',
    label: 'オプションメニュー（集約）',
    visible: true,
    order: 4,
    config: {},
  },
  {
    id: 'area-news',
    type: 'area_news',
    label: 'お知らせ（集約）',
    visible: true,
    order: 5,
    config: { max_items: 5 },
  },
  {
    id: 'area-columns',
    type: 'columns',
    label: 'コラム・お役立ち情報',
    visible: true,
    order: 6,
    config: { max_articles: 4, heading: 'コラム・お役立ち情報' },
  },
];

export interface AggregatedCoatingRow {
  tier: CoatingTier;
  storeIds: string[];
  storeNames: string[];
  storeSlugs: (string | undefined)[];
}

export interface AggregatedOptionRow {
  option: ServiceOption;
  storeIds: string[];
  storeNames: string[];
  storeSlugs: (string | undefined)[];
}

export interface StoreForAggregation {
  store_id: string;
  store_slug?: string;
  store_name: string;
  offered_coatings?: string[];
  custom_services?: string;
}

/** Pure: derive which stores carry each master coating tier.
 *  A store with no offered_coatings list → listed under ALL tiers (default-all). */
export function aggregateCoatings(
  stores: StoreForAggregation[],
  allTiers: CoatingTier[],
): AggregatedCoatingRow[] {
  return allTiers.map(tier => {
    const matching = stores.filter(store => {
      if (!store.offered_coatings || store.offered_coatings.length === 0) return true;
      return store.offered_coatings.includes(tier.id);
    });
    return {
      tier,
      storeIds: matching.map(s => s.store_id),
      storeNames: matching.map(s => s.store_name),
      storeSlugs: matching.map(s => s.store_slug),
    };
  });
}

/** Pure: derive which stores carry each service option.
 *  A store with no custom_services JSON list → listed under ALL options (default-all). */
export function aggregateOptions(
  stores: StoreForAggregation[],
  allOptions: ServiceOption[],
): AggregatedOptionRow[] {
  return allOptions.map(option => {
    const matching = stores.filter(store => {
      let customServices: { id?: string }[] = [];
      try {
        const parsed = JSON.parse(store.custom_services || '[]');
        if (Array.isArray(parsed)) customServices = parsed;
      } catch {
        /* treat as empty → default-all */
      }
      if (customServices.length === 0) return true;
      return customServices.some(s => s.id === option.id);
    });
    return {
      option,
      storeIds: matching.map(s => s.store_id),
      storeNames: matching.map(s => s.store_name),
      storeSlugs: matching.map(s => s.store_slug),
    };
  });
}

/** Stores passed to the area banner helpers — carry resolved Banner[]. */
export interface StoreForBanners {
  store_id: string;
  store_name: string;
  banners: Banner[];
}

/**
 * Pure: the banners actually shown in a store's promo carousel — the KeePer
 * default set overridden slot-by-slot by the store's `promo_banners`. Each slot
 * becomes an image Banner whose `id` is its image src (so the same default banner
 * shared across stores deduplicates in the area pool). This mirrors exactly what
 * PromoBannersBlock renders on the store page, so the hub aggregates "the banners
 * showing in the shop carousels".
 */
export function collectStoreBanners(store: { promo_banners?: string }): Banner[] {
  return resolveStoreCarouselBanners(store.promo_banners).map(slot => ({
    id: slot.src,
    template_id: '',
    custom_css: '',
    title: slot.alt,
    subtitle: '',
    image_url: slot.src,
    original_price: 0,
    discount_rate: 0,
    link_url: '',
    visible: true,
  }));
}

/**
 * Pure: collect the union of all banners across the area's stores.
 * bannerId is bare banner.id (no namespace prefix).
 */
export function collectAreaBanners(stores: StoreForBanners[]): AreaBannerSource[] {
  const result: AreaBannerSource[] = [];

  // No cross-store dedup: every shop's banners are listed (labeled by shop) so the
  // picker shows all shops in the area, even when several share the same default
  // banner. A ref's storeId disambiguates which shop's banner was picked.
  for (const store of stores) {
    for (const banner of store.banners) {
      if (!banner.id) continue;
      result.push({
        storeId: store.store_id,
        storeName: store.store_name,
        bannerId: banner.id,
        banner,
      });
    }
  }

  return result;
}

const MAX_AREA_BANNERS = 4;

/**
 * Pure: resolve an ordered list of AreaBannerRefs against the stores' banner
 * data. Stale refs (banner no longer exists) are silently dropped. Caps at 4.
 * Returns [] when no refs resolve — caller should render null in that case.
 */
export function resolveAreaBannerRefs(
  stores: StoreForBanners[],
  refs: AreaBannerRef[],
): Banner[] {
  if (!refs || refs.length === 0) return [];

  const resolved: Banner[] = [];

  for (const ref of refs) {
    if (resolved.length >= MAX_AREA_BANNERS) break;
    const store = stores.find(s => s.store_id === ref.storeId);
    if (!store) continue;
    const banner = store.banners.find(b => b.id === ref.bannerId);
    if (banner) resolved.push(banner);
  }

  return resolved;
}

/**
 * Pure: the banners to RENDER on the area hub. Uses the super_admin's curated
 * refs when any resolve; otherwise falls back to the first ≤4 banners from the
 * area's pool, so an un-curated hub still shows the shops' carousel banners
 * instead of an empty section. Returns [] only when the area has no banners at
 * all (caller renders null).
 */
export function resolveAreaBanners(
  stores: StoreForBanners[],
  refs: AreaBannerRef[],
): Banner[] {
  const curated = resolveAreaBannerRefs(stores, refs);
  if (curated.length > 0) return curated;
  // Auto-default: the area's banners deduped by image (banner.id) so the hub
  // doesn't render the same default banner repeatedly across shops, capped at 4.
  const seen = new Set<string>();
  const fallback: Banner[] = [];
  for (const { banner } of collectAreaBanners(stores)) {
    if (seen.has(banner.id)) continue;
    seen.add(banner.id);
    fallback.push(banner);
    if (fallback.length >= MAX_AREA_BANNERS) break;
  }
  return fallback;
}

export { DEFAULT_SERVICE_OPTIONS };

/** Describes which config fields the area 編集 tab renders for each block type.
 *  Returns 'readonly' for auto-aggregated types that need no admin input. */
export function areaFieldSpec(
  type: string,
): { key: string; kind: 'text' | 'number' | 'picker' }[] | 'readonly' {
  switch (type) {
    case 'area_banners':
      return [{ key: 'refs', kind: 'picker' }];
    case 'area_header':
      return [
        { key: 'title', kind: 'text' },
        { key: 'subtitle', kind: 'text' },
      ];
    case 'area_news':
      return [{ key: 'max_items', kind: 'number' }];
    case 'columns':
      return [
        { key: 'heading', kind: 'text' },
        { key: 'max_articles', kind: 'number' },
      ];
    case 'aggregated_coatings':
    case 'aggregated_options':
    case 'area_store_map':
      return 'readonly';
    default:
      return [];
  }
}
