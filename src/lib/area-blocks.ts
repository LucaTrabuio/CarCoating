import type { CoatingTier } from './types';
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

export const AREA_BLOCK_META: Record<string, { labelJa: string; icon: string }> = {
  area_header: { labelJa: 'エリアヘッダー', icon: '🗾' },
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
    config: {},
  },
  {
    id: 'area-store-map',
    type: 'area_store_map',
    label: '店舗マップ',
    visible: true,
    order: 1,
    config: {},
  },
  {
    id: 'aggregated-coatings',
    type: 'aggregated_coatings',
    label: 'コーティングメニュー（集約）',
    visible: true,
    order: 2,
    config: {},
  },
  {
    id: 'aggregated-options',
    type: 'aggregated_options',
    label: 'オプションメニュー（集約）',
    visible: true,
    order: 3,
    config: {},
  },
  {
    id: 'area-news',
    type: 'area_news',
    label: 'お知らせ（集約）',
    visible: true,
    order: 4,
    config: { max_items: 5 },
  },
  {
    id: 'area-columns',
    type: 'columns',
    label: 'コラム・お役立ち情報',
    visible: true,
    order: 5,
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

export { DEFAULT_SERVICE_OPTIONS };
