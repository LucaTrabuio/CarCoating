import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AREA_BLOCKS,
  AREA_BLOCK_META,
  aggregateCoatings,
  aggregateOptions,
} from '../lib/area-blocks';
import { DEFAULT_SERVICE_OPTIONS } from '../data/service-options';
import type { CoatingTier } from '../lib/types';

// ─── Minimal CoatingTier fixtures ───

function makeTier(id: string): CoatingTier {
  return {
    id,
    name: id,
    name_en: id,
    tagline: '',
    description: '',
    durability_years: '',
    application_time: '',
    maintenance_interval: '',
    gloss_rating: 3,
    water_repellency_rating: 3,
    layer_count: 1,
    layer_description: '',
    key_differentiator: '',
    is_popular: false,
    discount_tier: 20,
    prices: { SS: 0, S: 0, M: 0, L: 0, LL: 0, XL: 0 },
    maintenance_prices: null,
  };
}

const TIERS = [makeTier('crystal-keeper'), makeTier('diamond-keeper'), makeTier('w-diamond')];

describe('DEFAULT_AREA_BLOCKS', () => {
  it('has exactly 6 blocks', () => {
    expect(DEFAULT_AREA_BLOCKS).toHaveLength(6);
  });

  it('has unique ids', () => {
    const ids = DEFAULT_AREA_BLOCKS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all blocks are visible by default', () => {
    DEFAULT_AREA_BLOCKS.forEach(b => {
      expect(b.visible).toBe(true);
    });
  });

  it('has strictly increasing order values', () => {
    const orders = DEFAULT_AREA_BLOCKS.map(b => b.order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });

  it('leads with area_store_map in position 1 (after area_header)', () => {
    const sorted = [...DEFAULT_AREA_BLOCKS].sort((a, b) => a.order - b.order);
    expect(sorted[0].type).toBe('area_header');
    expect(sorted[1].type).toBe('area_store_map');
  });

  it('follows the required order: area_header → area_store_map → aggregated_coatings → aggregated_options → area_news → columns', () => {
    const sorted = [...DEFAULT_AREA_BLOCKS].sort((a, b) => a.order - b.order);
    const types = sorted.map(b => b.type);
    expect(types).toEqual([
      'area_header',
      'area_store_map',
      'aggregated_coatings',
      'aggregated_options',
      'area_news',
      'columns',
    ]);
  });
});

describe('AREA_BLOCK_META', () => {
  it('has an entry for every type in DEFAULT_AREA_BLOCKS', () => {
    DEFAULT_AREA_BLOCKS.forEach(block => {
      expect(AREA_BLOCK_META[block.type]).toBeDefined();
      expect(typeof AREA_BLOCK_META[block.type].labelJa).toBe('string');
      expect(typeof AREA_BLOCK_META[block.type].icon).toBe('string');
    });
  });
});

describe('aggregateCoatings', () => {
  it('returns one row per tier', () => {
    const rows = aggregateCoatings([], TIERS);
    expect(rows).toHaveLength(TIERS.length);
  });

  it('default-all: store with no offered_coatings appears under ALL tiers', () => {
    const stores = [
      { store_id: 'store-a', store_name: 'A', custom_services: '' },
      { store_id: 'store-b', store_name: 'B', offered_coatings: [], custom_services: '' },
    ];
    const rows = aggregateCoatings(stores, TIERS);
    rows.forEach(row => {
      expect(row.storeIds).toContain('store-a');
      expect(row.storeIds).toContain('store-b');
    });
  });

  it('explicit offered_coatings: store only appears under matching tiers', () => {
    const stores = [
      { store_id: 'store-a', store_name: 'A', offered_coatings: ['crystal-keeper'], custom_services: '' },
      { store_id: 'store-b', store_name: 'B', offered_coatings: ['diamond-keeper', 'w-diamond'], custom_services: '' },
    ];
    const rows = aggregateCoatings(stores, TIERS);
    const crystal = rows.find(r => r.tier.id === 'crystal-keeper')!;
    const diamond = rows.find(r => r.tier.id === 'diamond-keeper')!;
    const wdiamond = rows.find(r => r.tier.id === 'w-diamond')!;

    expect(crystal.storeIds).toContain('store-a');
    expect(crystal.storeIds).not.toContain('store-b');

    expect(diamond.storeIds).toContain('store-b');
    expect(diamond.storeIds).not.toContain('store-a');

    expect(wdiamond.storeIds).toContain('store-b');
    expect(wdiamond.storeIds).not.toContain('store-a');
  });

  it('empty store list returns rows with no store ids', () => {
    const rows = aggregateCoatings([], TIERS);
    rows.forEach(row => {
      expect(row.storeIds).toHaveLength(0);
    });
  });
});

describe('aggregateOptions', () => {
  const options = DEFAULT_SERVICE_OPTIONS.slice(0, 3);

  it('returns one row per option', () => {
    const rows = aggregateOptions([], options);
    expect(rows).toHaveLength(options.length);
  });

  it('default-all: store with empty custom_services appears under ALL options', () => {
    const stores = [
      { store_id: 'store-a', store_name: 'A', custom_services: '' },
      { store_id: 'store-b', store_name: 'B', custom_services: '[]' },
    ];
    const rows = aggregateOptions(stores, options);
    rows.forEach(row => {
      expect(row.storeIds).toContain('store-a');
      expect(row.storeIds).toContain('store-b');
    });
  });

  it('explicit custom_services: store only appears under matching options', () => {
    const firstOptionId = options[0].id;
    const stores = [
      { store_id: 'store-a', store_name: 'A', custom_services: JSON.stringify([{ id: firstOptionId }]) },
      { store_id: 'store-b', store_name: 'B', custom_services: '' },
    ];
    const rows = aggregateOptions(stores, options);
    const firstRow = rows.find(r => r.option.id === firstOptionId)!;
    const otherRow = rows.find(r => r.option.id !== firstOptionId)!;

    expect(firstRow.storeIds).toContain('store-a');
    expect(otherRow.storeIds).toContain('store-b');
    expect(otherRow.storeIds).not.toContain('store-a');
  });

  it('empty store list returns rows with no store ids', () => {
    const rows = aggregateOptions([], options);
    rows.forEach(row => {
      expect(row.storeIds).toHaveLength(0);
    });
  });
});
