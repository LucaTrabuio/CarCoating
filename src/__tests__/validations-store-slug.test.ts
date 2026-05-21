import { describe, it, expect } from 'vitest';
import { v3StoreWriteSchema } from '../lib/validations';

const MINIMAL_STORE = {
  store_id: 'test-store',
  store_name: 'テスト店舗',
};

describe('v3StoreWriteSchema — store_slug refine', () => {
  it('accepts a normal store slug', () => {
    const result = v3StoreWriteSchema.safeParse({
      ...MINIMAL_STORE,
      store_slug: 'akita-joyful-rinkai',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty store_slug', () => {
    const result = v3StoreWriteSchema.safeParse({
      ...MINIMAL_STORE,
      store_slug: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts when store_slug is absent', () => {
    const result = v3StoreWriteSchema.safeParse(MINIMAL_STORE);
    expect(result.success).toBe(true);
  });

  it('rejects "guide" (reserved sub-page name)', () => {
    const result = v3StoreWriteSchema.safeParse({
      ...MINIMAL_STORE,
      store_slug: 'guide',
    });
    expect(result.success).toBe(false);
  });

  it('rejects each of the 11 reserved names', () => {
    const reserved = ['guide', 'access', 'coatings', 'price', 'options', 'booking', 'inquiry', 'reviews', 'cases', 'news', 'privacy'];
    for (const slug of reserved) {
      const result = v3StoreWriteSchema.safeParse({ ...MINIMAL_STORE, store_slug: slug });
      expect(result.success, `Expected "${slug}" to be rejected`).toBe(false);
    }
  });
});
