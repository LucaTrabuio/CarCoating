import { describe, it, expect } from 'vitest';
import { RESERVED_STORE_SLUGS, isReservedStoreSlug, storeHref } from '../lib/store-url';

describe('RESERVED_STORE_SLUGS', () => {
  it('contains exactly the 11 sub-page names', () => {
    expect(RESERVED_STORE_SLUGS).toHaveLength(11);
    for (const name of ['guide', 'access', 'coatings', 'price', 'options', 'booking', 'inquiry', 'reviews', 'cases', 'news', 'privacy']) {
      expect(RESERVED_STORE_SLUGS).toContain(name);
    }
  });
});

describe('isReservedStoreSlug', () => {
  it('returns true for all 11 reserved names', () => {
    for (const name of RESERVED_STORE_SLUGS) {
      expect(isReservedStoreSlug(name)).toBe(true);
    }
  });

  it('returns false for a normal store slug', () => {
    expect(isReservedStoreSlug('akita-joyful-rinkai')).toBe(false);
    expect(isReservedStoreSlug('fussa')).toBe(false);
    expect(isReservedStoreSlug('ichihara-honten')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isReservedStoreSlug('')).toBe(false);
  });
});

describe('storeHref', () => {
  it('returns nested path when areaSlug + sub_company_id + store_slug all present', () => {
    const store = { store_id: 'akita-joyful-rinkai', store_slug: 'akita-joyful-rinkai', sub_company_id: 'akita-sc' };
    expect(storeHref(store, 'akita')).toBe('/akita/akita-joyful-rinkai');
  });

  it('returns flat path when areaSlug is missing', () => {
    const store = { store_id: 'fussa', store_slug: 'fussa', sub_company_id: 'fussa-sc' };
    expect(storeHref(store)).toBe('/fussa');
    expect(storeHref(store, undefined)).toBe('/fussa');
  });

  it('returns flat path when sub_company_id is missing (standalone store)', () => {
    const store = { store_id: 'standalone', store_slug: 'standalone' };
    expect(storeHref(store, 'some-area')).toBe('/standalone');
  });

  it('returns flat path when store_slug is missing', () => {
    const store = { store_id: 'no-slug', sub_company_id: 'area-sc' };
    expect(storeHref(store, 'some-area')).toBe('/no-slug');
  });

  it('falls back to store_id in flat path when store_slug also missing', () => {
    const store = { store_id: 'my-store' };
    expect(storeHref(store, 'area')).toBe('/my-store');
  });
});
