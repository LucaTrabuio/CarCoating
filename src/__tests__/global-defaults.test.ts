import { describe, it, expect } from 'vitest';
import {
  applyDefaults,
  parseOverrideFlags,
  serializeOverrideFlags,
  withOverrideFlag,
  resolveStoreField,
  isSectionLocked,
  type GlobalDefaults,
} from '../lib/global-defaults';
import type { V3StoreData } from '../lib/v3-types';

function makeStore(over: Partial<V3StoreData> = {}): V3StoreData {
  return {
    store_id: 's1',
    store_name: 'Test',
    is_active: true,
    address: '',
    postal_code: '',
    prefecture: '',
    city: '',
    tel: '',
    business_hours: '',
    regular_holiday: '',
    email: '',
    line_url: '',
    lat: 0,
    lng: 0,
    parking_spaces: 0,
    landmark: '',
    nearby_stations: '[]',
    access_map_url: '',
    campaign_title: '',
    campaign_deadline: '',
    discount_rate: 0,
    campaign_color_code: '',
    hero_title: '',
    hero_subtitle: '',
    description: '',
    meta_description: '',
    seo_keywords: '',
    hero_image_url: '',
    logo_url: '',
    staff_photo_url: '',
    store_exterior_url: '',
    store_interior_url: '',
    before_after_url: '',
    campaign_banner_url: '',
    gallery_images: '[]',
    custom_services: '[]',
    price_multiplier: 1,
    min_price_limit: 0,
    has_booth: false,
    level1_staff_count: 0,
    level2_staff_count: 0,
    google_place_id: '',
    ...over,
  };
}

function makeDefaults(over: Partial<GlobalDefaults> = {}): GlobalDefaults {
  return {
    version: 1,
    values: {},
    policy: {},
    ...over,
  };
}

describe('parseOverrideFlags / serializeOverrideFlags', () => {
  it('round-trips a single flag', () => {
    const raw = serializeOverrideFlags({ banners: true });
    expect(parseOverrideFlags(raw)).toEqual({ banners: true });
  });

  it('ignores falsy and unknown keys', () => {
    const parsed = parseOverrideFlags(JSON.stringify({ banners: false, unknown: true, page_layout: true }));
    expect(parsed).toEqual({ page_layout: true });
  });

  it('tolerates malformed JSON', () => {
    expect(parseOverrideFlags('not-json')).toEqual({});
    expect(parseOverrideFlags(undefined)).toEqual({});
  });
});

describe('withOverrideFlag', () => {
  it('sets a flag', () => {
    const next = withOverrideFlag('{}', 'banners', true);
    expect(parseOverrideFlags(next)).toEqual({ banners: true });
  });
  it('clears a flag', () => {
    const next = withOverrideFlag(JSON.stringify({ banners: true, page_layout: true }), 'banners', false);
    expect(parseOverrideFlags(next)).toEqual({ page_layout: true });
  });
});

describe('resolveStoreField', () => {
  const globalBanners = '[{"id":"g1"}]';
  const storeBanners = '[{"id":"s1"}]';

  it('returns global when inheriting (no flag, policy allows override)', () => {
    const store = makeStore({ banners: storeBanners });
    const defs = makeDefaults({ values: { banners: globalBanners }, policy: { banners: { allowOverride: true } } });
    expect(resolveStoreField('banners', store, defs, {})).toBe(globalBanners);
  });

  it('returns store value when overridden', () => {
    const store = makeStore({ banners: storeBanners });
    const defs = makeDefaults({ values: { banners: globalBanners }, policy: { banners: { allowOverride: true } } });
    expect(resolveStoreField('banners', store, defs, { banners: true })).toBe(storeBanners);
  });

  it('returns global when locked, even if store has override', () => {
    const store = makeStore({ banners: storeBanners });
    const defs = makeDefaults({ values: { banners: globalBanners }, policy: { banners: { allowOverride: false } } });
    expect(resolveStoreField('banners', store, defs, { banners: true })).toBe(globalBanners);
  });

  it('isSectionLocked reports correctly', () => {
    expect(isSectionLocked('banners', makeDefaults({ policy: { banners: { allowOverride: false } } }))).toBe(true);
    expect(isSectionLocked('banners', makeDefaults({ policy: { banners: { allowOverride: true } } }))).toBe(false);
    expect(isSectionLocked('banners', makeDefaults())).toBe(false);
  });
});

describe('applyDefaults', () => {
  it('overlays global values onto an inheriting store', () => {
    const store = makeStore({ banners: '[{"id":"s1"}]' }); // no override_flags
    const defs = makeDefaults({
      values: { banners: '[{"id":"g1"}]', custom_services: '[{"id":"opt"}]' },
      policy: { banners: { allowOverride: true } },
    });
    const out = applyDefaults(store, defs);
    expect(out.banners).toBe('[{"id":"g1"}]');
    expect(out.custom_services).toBe('[{"id":"opt"}]');
  });

  it('preserves store value when override_flags marks it', () => {
    const store = makeStore({
      banners: '[{"id":"s1"}]',
      override_flags: JSON.stringify({ banners: true }),
    });
    const defs = makeDefaults({
      values: { banners: '[{"id":"g1"}]' },
      policy: { banners: { allowOverride: true } },
    });
    const out = applyDefaults(store, defs);
    expect(out.banners).toBe('[{"id":"s1"}]');
  });

  it('ignores override_flags when section is locked', () => {
    const store = makeStore({
      banners: '[{"id":"s1"}]',
      override_flags: JSON.stringify({ banners: true }),
    });
    const defs = makeDefaults({
      values: { banners: '[{"id":"g1"}]' },
      policy: { banners: { allowOverride: false } },
    });
    const out = applyDefaults(store, defs);
    expect(out.banners).toBe('[{"id":"g1"}]');
  });
});
