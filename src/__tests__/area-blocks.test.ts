import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AREA_BLOCKS,
  AREA_BLOCK_META,
  aggregateCoatings,
  aggregateOptions,
  collectAreaBanners,
  resolveAreaBannerRefs,
  areaFieldSpec,
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
  it('has exactly 7 blocks', () => {
    expect(DEFAULT_AREA_BLOCKS).toHaveLength(7);
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

  it('leads with area_banners in position 1 (after area_header)', () => {
    const sorted = [...DEFAULT_AREA_BLOCKS].sort((a, b) => a.order - b.order);
    expect(sorted[0].type).toBe('area_header');
    expect(sorted[1].type).toBe('area_banners');
  });

  it('area_banners default block has config.refs === []', () => {
    const block = DEFAULT_AREA_BLOCKS.find(b => b.type === 'area_banners')!;
    expect(block).toBeDefined();
    expect(block.config.refs).toEqual([]);
  });

  it('area_banners default block is visible', () => {
    const block = DEFAULT_AREA_BLOCKS.find(b => b.type === 'area_banners')!;
    expect(block.visible).toBe(true);
  });

  it('area_header default block has config.title and config.subtitle both empty strings', () => {
    const block = DEFAULT_AREA_BLOCKS.find(b => b.type === 'area_header')!;
    expect(block).toBeDefined();
    expect(block.config.title).toBe('');
    expect(block.config.subtitle).toBe('');
  });

  it('follows the required order: area_header → area_banners → area_store_map → aggregated_coatings → aggregated_options → area_news → columns', () => {
    const sorted = [...DEFAULT_AREA_BLOCKS].sort((a, b) => a.order - b.order);
    const types = sorted.map(b => b.type);
    expect(types).toEqual([
      'area_header',
      'area_banners',
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

describe('collectAreaBanners', () => {
  it('returns empty array for stores with no banners', () => {
    const stores = [
      { store_id: 'a', store_name: 'A', banners: '', promo_banners: '' },
    ];
    expect(collectAreaBanners(stores)).toHaveLength(0);
  });

  it('gathers named banners with banner:<id> scheme', () => {
    const banner = { id: 'b1', title: 'B1', template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true };
    const stores = [
      { store_id: 'a', store_name: 'A', banners: JSON.stringify([banner]), promo_banners: '' },
    ];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(1);
    expect(pool[0].bannerId).toBe('banner:b1');
    expect(pool[0].storeId).toBe('a');
  });

  it('gathers promo_banners with promo:<index> scheme', () => {
    const promos = [{ src: 'http://img', alt: 'promo' }];
    const stores = [
      { store_id: 'b', store_name: 'B', banners: '', promo_banners: JSON.stringify(promos) },
    ];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(1);
    expect(pool[0].bannerId).toBe('promo:0');
    expect(pool[0].storeId).toBe('b');
  });

  it('namespaces do not collide: banner:0 !== promo:0', () => {
    const banner = { id: '0', title: 'named', template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true };
    const stores = [
      { store_id: 'x', store_name: 'X', banners: JSON.stringify([banner]), promo_banners: JSON.stringify([{ src: 'url', alt: 'alt' }]) },
    ];
    const pool = collectAreaBanners(stores);
    const ids = pool.map(p => p.bannerId);
    expect(ids).toContain('banner:0');
    expect(ids).toContain('promo:0');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skips stores with malformed JSON (no throw)', () => {
    const stores = [
      { store_id: 'bad', store_name: 'Bad', banners: 'NOT_JSON', promo_banners: '{broken' },
    ];
    expect(() => collectAreaBanners(stores)).not.toThrow();
    expect(collectAreaBanners(stores)).toHaveLength(0);
  });

  it('gathers banners across multiple stores', () => {
    const b1 = { id: 'x1', title: 'X1', template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true };
    const b2 = { id: 'x2', title: 'X2', template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true };
    const stores = [
      { store_id: 's1', store_name: 'S1', banners: JSON.stringify([b1]), promo_banners: '' },
      { store_id: 's2', store_name: 'S2', banners: JSON.stringify([b2]), promo_banners: '' },
    ];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(2);
    expect(pool.map(p => p.storeId)).toContain('s1');
    expect(pool.map(p => p.storeId)).toContain('s2');
  });
});

describe('resolveAreaBannerRefs', () => {
  const banner1 = { id: 'b1', title: 'B1', template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true };
  const banner2 = { id: 'b2', title: 'B2', template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true };
  const stores = [
    { store_id: 's1', store_name: 'S1', banners: JSON.stringify([banner1, banner2]), promo_banners: '' },
  ];

  it('returns empty array for empty refs', () => {
    expect(resolveAreaBannerRefs(stores, [])).toEqual([]);
  });

  it('resolves valid refs and preserves order', () => {
    const refs = [
      { storeId: 's1', bannerId: 'banner:b2' },
      { storeId: 's1', bannerId: 'banner:b1' },
    ];
    const resolved = resolveAreaBannerRefs(stores, refs);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].id).toBe('b2');
    expect(resolved[1].id).toBe('b1');
  });

  it('drops stale refs silently', () => {
    const refs = [
      { storeId: 's1', bannerId: 'banner:nonexistent' },
      { storeId: 's1', bannerId: 'banner:b1' },
    ];
    const resolved = resolveAreaBannerRefs(stores, refs);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('b1');
  });

  it('caps at 4 banners', () => {
    const banners = Array.from({ length: 6 }, (_, i) => ({
      id: `cap${i}`, title: `C${i}`, template_id: '', custom_css: '', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', visible: true,
    }));
    const capStores = [{ store_id: 'c', store_name: 'C', banners: JSON.stringify(banners), promo_banners: '' }];
    const refs = banners.map(b => ({ storeId: 'c', bannerId: `banner:${b.id}` }));
    const resolved = resolveAreaBannerRefs(capStores, refs);
    expect(resolved).toHaveLength(4);
  });
});

describe('areaFieldSpec', () => {
  it('area_banners → picker field for refs', () => {
    const spec = areaFieldSpec('area_banners');
    expect(spec).not.toBe('readonly');
    expect(Array.isArray(spec)).toBe(true);
    const fields = spec as { key: string; kind: string }[];
    expect(fields).toHaveLength(1);
    expect(fields[0]).toEqual({ key: 'refs', kind: 'picker' });
  });

  it('area_header → title and subtitle text fields', () => {
    const spec = areaFieldSpec('area_header');
    expect(spec).not.toBe('readonly');
    const fields = spec as { key: string; kind: string }[];
    expect(fields).toHaveLength(2);
    expect(fields.find(f => f.key === 'title')?.kind).toBe('text');
    expect(fields.find(f => f.key === 'subtitle')?.kind).toBe('text');
  });

  it('area_news → max_items number field', () => {
    const spec = areaFieldSpec('area_news');
    expect(spec).not.toBe('readonly');
    const fields = spec as { key: string; kind: string }[];
    expect(fields).toHaveLength(1);
    expect(fields[0]).toEqual({ key: 'max_items', kind: 'number' });
  });

  it('columns → heading text + max_articles number', () => {
    const spec = areaFieldSpec('columns');
    expect(spec).not.toBe('readonly');
    const fields = spec as { key: string; kind: string }[];
    expect(fields).toHaveLength(2);
    expect(fields.find(f => f.key === 'heading')?.kind).toBe('text');
    expect(fields.find(f => f.key === 'max_articles')?.kind).toBe('number');
  });

  it('aggregated_coatings → readonly', () => {
    expect(areaFieldSpec('aggregated_coatings')).toBe('readonly');
  });

  it('aggregated_options → readonly', () => {
    expect(areaFieldSpec('aggregated_options')).toBe('readonly');
  });

  it('area_store_map → readonly', () => {
    expect(areaFieldSpec('area_store_map')).toBe('readonly');
  });

  it('every type in DEFAULT_AREA_BLOCKS has a spec (not undefined)', () => {
    DEFAULT_AREA_BLOCKS.forEach(block => {
      const spec = areaFieldSpec(block.type);
      expect(spec).toBeDefined();
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
