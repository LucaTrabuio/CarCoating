import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AREA_BLOCKS,
  AREA_BLOCK_META,
  aggregateCoatings,
  aggregateOptions,
  collectAreaBanners,
  collectStoreBanners,
  resolveAreaBannerRefs,
  resolveAreaBanners,
  areaFieldSpec,
} from '../lib/area-blocks';
import { DEFAULT_PROMO_BANNERS } from '../lib/promo-banners';
import { DEFAULT_SERVICE_OPTIONS } from '../data/service-options';
import type { CoatingTier } from '../lib/types';
import type { Banner } from '../lib/block-types';

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

function makeBanner(id: string, overrides: Partial<Banner> = {}): Banner {
  return {
    id,
    template_id: '',
    custom_css: '',
    title: id,
    subtitle: '',
    image_url: '',
    original_price: 0,
    discount_rate: 0,
    link_url: '',
    visible: true,
    ...overrides,
  };
}

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

describe('collectStoreBanners', () => {
  it('returns the KeePer default carousel banners for a store with no promo_banners', () => {
    const result = collectStoreBanners({});
    expect(result).toHaveLength(DEFAULT_PROMO_BANNERS.length);
    // id and image_url are the image src; same as the store carousel shows.
    expect(result.map(b => b.id)).toEqual(DEFAULT_PROMO_BANNERS.map(d => d.src));
    expect(result.map(b => b.image_url)).toEqual(DEFAULT_PROMO_BANNERS.map(d => d.src));
    expect(result.map(b => b.title)).toEqual(DEFAULT_PROMO_BANNERS.map(d => d.alt));
    expect(result.every(b => b.visible)).toBe(true);
  });

  it('overrides a default slot with the store promo_banner at that index', () => {
    const promos = [{ src: 'https://custom/0.png', alt: 'custom 0' }];
    const result = collectStoreBanners({ promo_banners: JSON.stringify(promos) });
    expect(result).toHaveLength(DEFAULT_PROMO_BANNERS.length);
    expect(result[0].id).toBe('https://custom/0.png');
    expect(result[0].image_url).toBe('https://custom/0.png');
    expect(result[0].title).toBe('custom 0');
    // untouched slots stay default
    expect(result[1].id).toBe(DEFAULT_PROMO_BANNERS[1].src);
  });

  it('falls back to the default alt when an override omits alt', () => {
    const promos = [{ src: 'https://custom/0.png' }];
    const result = collectStoreBanners({ promo_banners: JSON.stringify(promos) });
    expect(result[0].title).toBe(DEFAULT_PROMO_BANNERS[0].alt);
  });

  it('does not throw on malformed promo_banners (defaults only)', () => {
    expect(() => collectStoreBanners({ promo_banners: '{broken' })).not.toThrow();
    expect(collectStoreBanners({ promo_banners: '{broken' })).toHaveLength(DEFAULT_PROMO_BANNERS.length);
  });
});

describe('collectAreaBanners', () => {
  it('returns empty array for stores with no banners', () => {
    const stores = [{ store_id: 'a', store_name: 'A', banners: [] }];
    expect(collectAreaBanners(stores)).toHaveLength(0);
  });

  it('gathers banners with bare banner.id as bannerId', () => {
    const banner = makeBanner('b1');
    const stores = [{ store_id: 'a', store_name: 'A', banners: [banner] }];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(1);
    expect(pool[0].bannerId).toBe('b1');
    expect(pool[0].storeId).toBe('a');
  });

  it('gathers banners across multiple stores', () => {
    const b1 = makeBanner('x1');
    const b2 = makeBanner('x2');
    const stores = [
      { store_id: 's1', store_name: 'S1', banners: [b1] },
      { store_id: 's2', store_name: 'S2', banners: [b2] },
    ];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(2);
    expect(pool.map(p => p.storeId)).toContain('s1');
    expect(pool.map(p => p.storeId)).toContain('s2');
  });

  it('includes promo synthetic banners passed via banners array', () => {
    const promoSynth: Banner = { id: 'promo-0', template_id: '', custom_css: '', title: 'P', subtitle: '', image_url: 'u', original_price: 0, discount_rate: 0, link_url: '', visible: true };
    const stores = [{ store_id: 'b', store_name: 'B', banners: [promoSynth] }];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(1);
    expect(pool[0].bannerId).toBe('promo-0');
  });

  it('lists every shop without cross-store dedup (all shops appear in the picker)', () => {
    // Both shops share the same default banner, but the picker must show each shop
    // so a super_admin can see/curate all shops in the area.
    const stores = [
      { store_id: 's1', store_name: 'S1', banners: [makeBanner('/images/keeper-03.jpg')] },
      { store_id: 's2', store_name: 'S2', banners: [makeBanner('/images/keeper-03.jpg')] },
    ];
    const pool = collectAreaBanners(stores);
    expect(pool).toHaveLength(2);
    expect(pool.map(p => p.storeId)).toEqual(['s1', 's2']);
  });
});

describe('resolveAreaBannerRefs', () => {
  const banner1 = makeBanner('b1');
  const banner2 = makeBanner('b2');
  const stores = [
    { store_id: 's1', store_name: 'S1', banners: [banner1, banner2] },
  ];

  it('returns empty array for empty refs', () => {
    expect(resolveAreaBannerRefs(stores, [])).toEqual([]);
  });

  it('resolves valid refs and preserves order', () => {
    const refs = [
      { storeId: 's1', bannerId: 'b2' },
      { storeId: 's1', bannerId: 'b1' },
    ];
    const resolved = resolveAreaBannerRefs(stores, refs);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].id).toBe('b2');
    expect(resolved[1].id).toBe('b1');
  });

  it('drops stale refs silently', () => {
    const refs = [
      { storeId: 's1', bannerId: 'nonexistent' },
      { storeId: 's1', bannerId: 'b1' },
    ];
    const resolved = resolveAreaBannerRefs(stores, refs);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('b1');
  });

  it('caps at 4 banners', () => {
    const banners = Array.from({ length: 6 }, (_, i) => makeBanner(`cap${i}`));
    const capStores = [{ store_id: 'c', store_name: 'C', banners }];
    const refs = banners.map(b => ({ storeId: 'c', bannerId: b.id }));
    const resolved = resolveAreaBannerRefs(capStores, refs);
    expect(resolved).toHaveLength(4);
  });
});

describe('resolveAreaBanners (curated-or-default)', () => {
  const b1 = makeBanner('b1');
  const b2 = makeBanner('b2');
  const stores = [{ store_id: 's1', store_name: 'S1', banners: [b1, b2] }];

  it('uses curated refs when they resolve', () => {
    const resolved = resolveAreaBanners(stores, [{ storeId: 's1', bannerId: 'b2' }]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('b2');
  });

  it('falls back to the first <=4 pool banners when there are no refs', () => {
    const resolved = resolveAreaBanners(stores, []);
    expect(resolved.map(b => b.id)).toEqual(['b1', 'b2']);
  });

  it('falls back when all refs are stale', () => {
    const resolved = resolveAreaBanners(stores, [{ storeId: 'gone', bannerId: 'gone' }]);
    expect(resolved.map(b => b.id)).toEqual(['b1', 'b2']);
  });

  it('returns [] when the area has no banners at all', () => {
    expect(resolveAreaBanners([{ store_id: 's', store_name: 'S', banners: [] }], [])).toEqual([]);
  });

  it('dedups shared banners in the auto-default so the hub never repeats an image', () => {
    const stores = [
      { store_id: 's1', store_name: 'S1', banners: [makeBanner('/images/keeper-03.jpg'), makeBanner('/images/keeper-01.jpg')] },
      { store_id: 's2', store_name: 'S2', banners: [makeBanner('/images/keeper-03.jpg'), makeBanner('/images/keeper-01.jpg')] },
    ];
    const resolved = resolveAreaBanners(stores, []);
    expect(resolved.map(b => b.id)).toEqual(['/images/keeper-03.jpg', '/images/keeper-01.jpg']);
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
