import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDefaultLayout,
  parsePageLayout,
  serializePageLayout,
  createBlock,
  getBlockMeta,
  BLOCK_META,
  _resetBlockIdCounter,
  type PageLayout,
  type HeroConfig,
  type BlockType,
} from '../lib/block-types';

beforeEach(() => {
  _resetBlockIdCounter();
});

describe('generateDefaultLayout', () => {
  it('creates a layout with 16 default blocks', () => {
    const layout = generateDefaultLayout();
    expect(layout.version).toBe(2);
    expect(layout.blocks).toHaveLength(16);
  });

  it('assigns sequential order to blocks', () => {
    const layout = generateDefaultLayout();
    layout.blocks.forEach((block, i) => {
      expect(block.order).toBe(i);
    });
  });

  it('starts with hero block', () => {
    const layout = generateDefaultLayout();
    expect(layout.blocks[0].type).toBe('hero');
  });

  it('ends with cta block', () => {
    const layout = generateDefaultLayout();
    expect(layout.blocks[layout.blocks.length - 1].type).toBe('cta');
  });

  it('all blocks are visible by default', () => {
    const layout = generateDefaultLayout();
    layout.blocks.forEach(block => {
      expect(block.visible).toBe(true);
    });
  });

  it('all blocks have unique IDs', () => {
    const layout = generateDefaultLayout();
    const ids = layout.blocks.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pulls hero config from store data', () => {
    const layout = generateDefaultLayout({
      hero_title: 'テスト店舗',
      hero_subtitle: 'サブタイトル',
      hero_image_url: 'https://example.com/hero.jpg',
      has_booth: true,
    });
    const hero = layout.blocks.find(b => b.type === 'hero')!;
    const config = hero.config as HeroConfig;
    expect(config.title).toBe('テスト店舗');
    expect(config.subtitle).toBe('サブタイトル');
    expect(config.image_url).toBe('https://example.com/hero.jpg');
    expect(config.show_badges).toBe(true);
  });

  it('uses defaults when no store data provided', () => {
    const layout = generateDefaultLayout();
    const hero = layout.blocks.find(b => b.type === 'hero')!;
    const config = hero.config as HeroConfig;
    expect(config.title).toBe('');
    expect(config.show_badges).toBe(true);
    expect(config.show_cta_booking).toBe(true);
  });
});

describe('parsePageLayout', () => {
  it('returns default layout for undefined input', () => {
    const layout = parsePageLayout(undefined);
    expect(layout.version).toBe(2);
    expect(layout.blocks.length).toBeGreaterThan(0);
  });

  it('returns default layout for empty string', () => {
    const layout = parsePageLayout('');
    expect(layout.version).toBe(2);
  });

  it('returns default layout for invalid JSON', () => {
    const layout = parsePageLayout('not json');
    expect(layout.version).toBe(2);
  });

  it('returns default layout for wrong version', () => {
    const layout = parsePageLayout(JSON.stringify({ version: 1, blocks: [] }));
    expect(layout.version).toBe(2);
    expect(layout.blocks.length).toBeGreaterThan(0); // default, not empty
  });

  it('parses valid layout JSON', () => {
    const original: PageLayout = {
      version: 2,
      blocks: [
        { id: 'test-1', type: 'hero', visible: true, order: 0, config: { title: 'Test', subtitle: '', image_url: '', show_badges: true, show_cta_booking: true, show_cta_inquiry: true } },
      ],
    };
    const json = JSON.stringify(original);
    const parsed = parsePageLayout(json);
    expect(parsed.version).toBe(2);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].id).toBe('test-1');
    expect((parsed.blocks[0].config as HeroConfig).title).toBe('Test');
  });
});

describe('serializePageLayout', () => {
  it('roundtrips correctly', () => {
    const layout = generateDefaultLayout();
    const json = serializePageLayout(layout);
    const parsed = parsePageLayout(json);
    expect(parsed.version).toBe(layout.version);
    expect(parsed.blocks).toHaveLength(layout.blocks.length);
    expect(parsed.blocks[0].type).toBe(layout.blocks[0].type);
  });
});

describe('createBlock', () => {
  it('creates a block with the correct type and order', () => {
    const block = createBlock('certifications', 5);
    expect(block.type).toBe('certifications');
    expect(block.order).toBe(5);
    expect(block.visible).toBe(true);
  });

  it('uses default config from BLOCK_META', () => {
    const block = createBlock('pricing', 0);
    expect(block.config).toBeDefined();
    expect((block.config as { blur_fields: string[] }).blur_fields).toEqual([]);
  });

  it('throws for unknown block type', () => {
    expect(() => createBlock('nonexistent' as BlockType, 0)).toThrow('Unknown block type');
  });

  it('creates independent config copies (no shared references)', () => {
    const block1 = createBlock('usp', 0);
    const block2 = createBlock('usp', 1);
    (block1.config as { items: unknown[] }).items.push({ id: 'extra' });
    expect((block2.config as { items: unknown[] }).items.length).toBe(6);
  });
});

describe('getBlockMeta', () => {
  it('returns metadata for known block types', () => {
    const meta = getBlockMeta('hero');
    expect(meta).toBeDefined();
    expect(meta!.label).toBe('Hero Banner');
    expect(meta!.labelJa).toBe('ヒーローバナー');
  });

  it('returns undefined for unknown type', () => {
    expect(getBlockMeta('nonexistent' as BlockType)).toBeUndefined();
  });
});

describe('BLOCK_META', () => {
  it('has metadata for all 20 block types', () => {
    expect(BLOCK_META).toHaveLength(20);
  });

  it('all block types have unique types', () => {
    const types = BLOCK_META.map(m => m.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('all block types have both English and Japanese labels', () => {
    BLOCK_META.forEach(meta => {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.labelJa.length).toBeGreaterThan(0);
    });
  });
});
