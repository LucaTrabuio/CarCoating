import type { CoatingTier } from './types';
import type { Banner } from './block-types';
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
}

export interface AggregatedOptionRow {
  option: ServiceOption;
  storeIds: string[];
  storeNames: string[];
}

export interface StoreForAggregation {
  store_id: string;
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
    };
  });
}

/** Stores passed to the area banner helpers — carry raw JSON strings. */
export interface StoreForBanners {
  store_id: string;
  store_name: string;
  banners?: string;
  promo_banners?: string;
}

/**
 * Pure: collect the union of all banners across the area's stores.
 *
 * bannerId scheme:
 *  - `banner:<banner.id>` for entries from `banners` (Banner[], each has .id)
 *  - `promo:<index>` for entries from `promo_banners` ({src,alt}[])
 *
 * Malformed JSON fields are skipped silently.
 */
export function collectAreaBanners(stores: StoreForBanners[]): AreaBannerSource[] {
  const result: AreaBannerSource[] = [];

  for (const store of stores) {
    // Named banners (Banner[])
    let parsedBanners: Banner[] = [];
    try {
      const raw = JSON.parse(store.banners || '[]');
      if (Array.isArray(raw)) parsedBanners = raw as Banner[];
    } catch {
      /* skip malformed */
    }
    for (const banner of parsedBanners) {
      if (!banner.id) continue;
      result.push({
        storeId: store.store_id,
        storeName: store.store_name,
        bannerId: `banner:${banner.id}`,
        banner,
      });
    }

    // Promo banners ({src,alt}[]) — synthesise a minimal Banner for rendering
    let parsedPromo: { src: string; alt: string }[] = [];
    try {
      const raw = JSON.parse(store.promo_banners || '[]');
      if (Array.isArray(raw)) parsedPromo = raw as { src: string; alt: string }[];
    } catch {
      /* skip malformed */
    }
    parsedPromo.forEach((p, index) => {
      const syntheticBanner: Banner = {
        id: `promo-${store.store_id}-${index}`,
        template_id: '',
        custom_css: '',
        title: p.alt || '',
        subtitle: '',
        image_url: p.src || '',
        original_price: 0,
        discount_rate: 0,
        link_url: '',
        visible: true,
      };
      result.push({
        storeId: store.store_id,
        storeName: store.store_name,
        bannerId: `promo:${index}`,
        banner: syntheticBanner,
      });
    });
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

  const pool = collectAreaBanners(stores);
  const resolved: Banner[] = [];

  for (const ref of refs) {
    if (resolved.length >= MAX_AREA_BANNERS) break;
    const found = pool.find(
      entry => entry.storeId === ref.storeId && entry.bannerId === ref.bannerId,
    );
    if (found) resolved.push(found.banner);
  }

  return resolved;
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
