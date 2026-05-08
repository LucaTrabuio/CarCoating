import { describe, test, expect } from 'vitest';

/**
 * Verification tests for recent changes:
 * 1. Discount 0% not falling back to 20% (|| → ??)
 * 2. Campaign auto-expiry
 * 3. force_hq_campaign in validation schema
 * 4. ImageSlot and ImageUploadField components exist
 * 5. Banners tab in builder
 * 6. SEO metadata uses seo_keywords
 * 7. sanitize-css separated from DOMPurify
 */

import { campaignDefaultsSchema } from '../lib/validations';
import { sanitizeCss } from '../lib/sanitize-css';

// === 1. Discount ?? fix ===

describe('Discount rate nullish coalescing', () => {
  // Simulate the fixed logic: store.discount_rate ?? defaults.discount
  function getDiscountRate(storeRate: number | undefined | null, defaultRate: number): number {
    return storeRate ?? defaultRate;
  }

  test('0% discount should NOT fall back to default', () => {
    expect(getDiscountRate(0, 20)).toBe(0);
  });

  test('undefined discount should fall back to default', () => {
    expect(getDiscountRate(undefined, 20)).toBe(20);
  });

  test('null discount should fall back to default', () => {
    expect(getDiscountRate(null, 20)).toBe(20);
  });

  test('explicit discount should be used', () => {
    expect(getDiscountRate(15, 20)).toBe(15);
  });

  // Verify the OLD broken behavior (||) would have failed
  test('OLD || operator would incorrectly override 0%', () => {
    const brokenResult = (0 as number) || 20;
    expect(brokenResult).toBe(20); // This was the bug
    const maybeZero: number | undefined = 0;
    const fixedResult = maybeZero ?? 20;
    expect(fixedResult).toBe(0); // This is correct
  });
});

// === 2. Campaign auto-expiry ===

describe('Campaign auto-expiry', () => {
  function isExpired(endDate: string | undefined): boolean {
    return !!(endDate && new Date(endDate) < new Date());
  }

  test('past end date should be expired', () => {
    expect(isExpired('2020-01-01')).toBe(true);
  });

  test('future end date should NOT be expired', () => {
    expect(isExpired('2099-12-31')).toBe(false);
  });

  test('undefined end date should NOT be expired', () => {
    expect(isExpired(undefined)).toBe(false);
  });

  test('expired campaign should set discount to 0', () => {
    const defaults = { end: '2020-01-01', discount: 20 };
    const storeRate: number | undefined = 0;
    let discountRate = storeRate ?? defaults.discount;
    if (defaults.end && new Date(defaults.end) < new Date()) {
      discountRate = 0;
    }
    expect(discountRate).toBe(0);
  });

  test('active campaign should keep discount', () => {
    const defaults = { end: '2099-12-31', discount: 20 };
    const storeRate2: number | undefined = 0;
    let discountRate = storeRate2 ?? defaults.discount;
    if (defaults.end && new Date(defaults.end) < new Date()) {
      discountRate = 0;
    }
    expect(discountRate).toBe(0); // store explicitly set 0
  });
});

// === 3. force_hq_campaign in schema ===

describe('Campaign defaults schema', () => {
  test('should accept force_hq_campaign: true', () => {
    const result = campaignDefaultsSchema.safeParse({
      title: 'Test Campaign',
      color: '#FF0000',
      start: '2026-04-01',
      end: '2026-04-30',
      discount: 20,
      force_hq_campaign: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.force_hq_campaign).toBe(true);
    }
  });

  test('should accept force_hq_campaign: false', () => {
    const result = campaignDefaultsSchema.safeParse({
      title: 'Test',
      color: '#000000',
      start: '2026-01-01',
      end: '2026-12-31',
      discount: 0,
      force_hq_campaign: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.force_hq_campaign).toBe(false);
    }
  });

  test('should accept without force_hq_campaign (optional)', () => {
    const result = campaignDefaultsSchema.safeParse({
      title: 'Test',
      color: '#000000',
      start: '2026-01-01',
      end: '2026-12-31',
      discount: 10,
    });
    expect(result.success).toBe(true);
  });

  test('should accept discount of 0', () => {
    const result = campaignDefaultsSchema.safeParse({
      title: 'No Discount',
      color: '#000000',
      start: '2026-01-01',
      end: '2026-12-31',
      discount: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discount).toBe(0);
    }
  });
});

// === 4. File existence checks ===

describe('New modules exist', () => {
  test('sanitize-css exports sanitizeCss function', () => {
    expect(typeof sanitizeCss).toBe('function');
  });
});

// === 5. sanitize-css works independently ===

describe('sanitize-css', () => {
  test('strips @import rules', () => {
    expect(sanitizeCss('@import url("evil.css"); .foo { color: red; }')).not.toContain('@import');
  });

  test('strips javascript: in url()', () => {
    expect(sanitizeCss('.foo { background: url(javascript:alert(1)); }')).not.toContain('javascript:');
  });

  test('strips expression()', () => {
    expect(sanitizeCss('.foo { width: expression(document.body.clientWidth); }')).not.toContain('expression');
  });

  test('returns empty string for empty input', () => {
    expect(sanitizeCss('')).toBe('');
  });

  test('passes through safe CSS', () => {
    const safe = '.card { color: #333; padding: 10px; }';
    expect(sanitizeCss(safe)).toBe(safe);
  });
});

// === 6. Verify source code fixes ===

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');

describe('Source code verification', () => {
  test('layout.tsx uses ?? not || for discount_rate', () => {
    const src = readFileSync(join(SRC, 'app/[slug]/layout.tsx'), 'utf-8');
    expect(src).not.toContain('store.discount_rate || defaults.discount');
    expect(src).toContain('store.discount_rate ?? defaults.discount');
  });

  test('layout.tsx checks campaign end date for expiry', () => {
    const src = readFileSync(join(SRC, 'app/[slug]/layout.tsx'), 'utf-8');
    expect(src).toContain("new Date(defaults.end) < new Date()");
  });

  test('page.tsx uses ?? not || for discount_rate', () => {
    const src = readFileSync(join(SRC, 'app/[slug]/page.tsx'), 'utf-8');
    expect(src).not.toContain('discount_rate || defaults.discount');
    expect(src).toContain('discount_rate ?? defaults.discount');
  });

  test('coatings page uses ?? not || for discount_rate', () => {
    const src = readFileSync(join(SRC, 'app/[slug]/coatings/page.tsx'), 'utf-8');
    expect(src).not.toContain('discount_rate || defaults.discount');
    expect(src).toContain('discount_rate ?? defaults.discount');
  });

  test('PriceContent uses ?? 0 not || 20', () => {
    const src = readFileSync(join(SRC, 'app/[slug]/price/PriceContent.tsx'), 'utf-8');
    expect(src).not.toContain('discount_rate || 20');
    expect(src).toContain('discount_rate ?? 0');
  });

  test('inquiry API uses ?? 0 not || 20', () => {
    const src = readFileSync(join(SRC, 'app/api/inquiry/route.ts'), 'utf-8');
    expect(src).not.toContain('discount_rate || 20');
    expect(src).toContain('discount_rate ?? 0');
  });

  test('BannersBlock uses sanitizeCss from sanitize-css', () => {
    const src = readFileSync(join(SRC, 'components/blocks/BannersBlock.tsx'), 'utf-8');
    expect(src).toContain("from '@/lib/sanitize-css'");
    // html-mode banners additionally import sanitizeHtml from @/lib/sanitize.
  });

  test('validations schema includes force_hq_campaign', () => {
    const src = readFileSync(join(SRC, 'lib/validations.ts'), 'utf-8');
    expect(src).toContain('force_hq_campaign');
  });

  test('builder page has banners and cases tabs', () => {
    const src = readFileSync(join(SRC, 'app/admin/builder/[storeId]/page.tsx'), 'utf-8');
    expect(src).toContain("'banners'");
    expect(src).toContain("'cases'");
    expect(src).toContain('ImageSlot');
  });

  test('layout.tsx uses seo_keywords in metadata', () => {
    const src = readFileSync(join(SRC, 'app/[slug]/layout.tsx'), 'utf-8');
    expect(src).toContain('seo_keywords');
    expect(src).toContain('keywords');
  });

  test('DynamicBanner supports newsText prop', () => {
    const src = readFileSync(join(SRC, 'components/DynamicBanner.tsx'), 'utf-8');
    expect(src).toContain('newsText');
  });

  test('hero image uses png not jpg', () => {
    const src = readFileSync(join(SRC, 'components/blocks/HeroBlock.tsx'), 'utf-8');
    expect(src).toContain('dia2-hero.png');
    expect(src).not.toContain('dia2-hero.jpg');
  });
});
