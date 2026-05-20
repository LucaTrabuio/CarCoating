import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HOMEPAGE_BLOCKS,
  HOMEPAGE_BLOCK_META,
} from '../lib/homepage-blocks';

describe('DEFAULT_HOMEPAGE_BLOCKS', () => {
  it('has exactly 9 blocks', () => {
    expect(DEFAULT_HOMEPAGE_BLOCKS).toHaveLength(9);
  });

  it('includes all required block types including store_gallery', () => {
    const types = DEFAULT_HOMEPAGE_BLOCKS.map(b => b.type);
    expect(types).toContain('hero_home');
    expect(types).toContain('service_menu');
    expect(types).toContain('why_keeper');
    expect(types).toContain('store_gallery');
    expect(types).toContain('store_finder');
    expect(types).toContain('blog_section');
    expect(types).toContain('news_home');
    expect(types).toContain('process_home');
    expect(types).toContain('cta_home');
  });

  it('has unique ids', () => {
    const ids = DEFAULT_HOMEPAGE_BLOCKS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has strictly increasing order values', () => {
    const orders = DEFAULT_HOMEPAGE_BLOCKS.map(b => b.order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });

  it('all blocks are visible by default', () => {
    DEFAULT_HOMEPAGE_BLOCKS.forEach(block => {
      expect(block.visible).toBe(true);
    });
  });
});

describe('HOMEPAGE_BLOCK_META', () => {
  it('has an entry for every type in DEFAULT_HOMEPAGE_BLOCKS', () => {
    const defaultTypes = new Set(DEFAULT_HOMEPAGE_BLOCKS.map(b => b.type));
    defaultTypes.forEach(type => {
      expect(HOMEPAGE_BLOCK_META[type]).toBeDefined();
      expect(typeof HOMEPAGE_BLOCK_META[type].labelJa).toBe('string');
      expect(typeof HOMEPAGE_BLOCK_META[type].icon).toBe('string');
    });
  });
});
