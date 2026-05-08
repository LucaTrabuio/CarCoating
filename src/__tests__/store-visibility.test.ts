import { describe, it, expect } from 'vitest';
import { isWithinSeasonalWindow } from '../lib/firebase-stores';
import { storeVisibilityPatchSchema, MM_DD_REGEX } from '../lib/validations';

// ─── MM_DD_REGEX ──────────────────────────────────────────────

describe('MM_DD_REGEX', () => {
  it('accepts valid dates', () => {
    expect(MM_DD_REGEX.test('01-01')).toBe(true);
    expect(MM_DD_REGEX.test('12-31')).toBe(true);
    expect(MM_DD_REGEX.test('03-31')).toBe(true);
    expect(MM_DD_REGEX.test('12-01')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(MM_DD_REGEX.test('00-01')).toBe(false);
    expect(MM_DD_REGEX.test('13-01')).toBe(false);
    expect(MM_DD_REGEX.test('12-00')).toBe(false);
    expect(MM_DD_REGEX.test('12-32')).toBe(false);
    expect(MM_DD_REGEX.test('2024-01-01')).toBe(false);
    expect(MM_DD_REGEX.test('1-1')).toBe(false);
    expect(MM_DD_REGEX.test('')).toBe(false);
  });
});

// ─── isWithinSeasonalWindow ───────────────────────────────────

describe('isWithinSeasonalWindow', () => {
  describe('same-year window (start <= end)', () => {
    // 06-01 → 08-31
    it('returns true when today is inside window', () => {
      expect(isWithinSeasonalWindow('07-15', '06-01', '08-31')).toBe(true);
    });

    it('returns true on the start boundary', () => {
      expect(isWithinSeasonalWindow('06-01', '06-01', '08-31')).toBe(true);
    });

    it('returns true on the end boundary', () => {
      expect(isWithinSeasonalWindow('08-31', '06-01', '08-31')).toBe(true);
    });

    it('returns false before the window', () => {
      expect(isWithinSeasonalWindow('05-31', '06-01', '08-31')).toBe(false);
    });

    it('returns false after the window', () => {
      expect(isWithinSeasonalWindow('09-01', '06-01', '08-31')).toBe(false);
    });
  });

  describe('wrap-around window (start > end — crosses Dec 31)', () => {
    // 12-01 → 03-31 means December, January, February, March
    it('returns true in December (before year-end)', () => {
      expect(isWithinSeasonalWindow('12-15', '12-01', '03-31')).toBe(true);
    });

    it('returns true in January', () => {
      expect(isWithinSeasonalWindow('01-10', '12-01', '03-31')).toBe(true);
    });

    it('returns true on the start boundary', () => {
      expect(isWithinSeasonalWindow('12-01', '12-01', '03-31')).toBe(true);
    });

    it('returns true on the end boundary', () => {
      expect(isWithinSeasonalWindow('03-31', '12-01', '03-31')).toBe(true);
    });

    it('returns false in April (outside window)', () => {
      expect(isWithinSeasonalWindow('04-01', '12-01', '03-31')).toBe(false);
    });

    it('returns false in November (before start)', () => {
      expect(isWithinSeasonalWindow('11-30', '12-01', '03-31')).toBe(false);
    });
  });
});

// ─── storeVisibilityPatchSchema ───────────────────────────────

describe('storeVisibilityPatchSchema', () => {
  it('accepts hide_mode=null', () => {
    const result = storeVisibilityPatchSchema.safeParse({ hide_mode: null });
    expect(result.success).toBe(true);
  });

  it('accepts hide_mode=manual', () => {
    const result = storeVisibilityPatchSchema.safeParse({ hide_mode: 'manual' });
    expect(result.success).toBe(true);
  });

  it('accepts hide_mode=seasonal with valid MM-DD dates', () => {
    const result = storeVisibilityPatchSchema.safeParse({
      hide_mode: 'seasonal',
      seasonal_hide_start: '12-01',
      seasonal_hide_end: '03-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects hide_mode=seasonal with invalid start date', () => {
    const result = storeVisibilityPatchSchema.safeParse({
      hide_mode: 'seasonal',
      seasonal_hide_start: '2024-12-01',
      seasonal_hide_end: '03-31',
    });
    expect(result.success).toBe(false);
  });

  it('rejects hide_mode=seasonal without dates', () => {
    const result = storeVisibilityPatchSchema.safeParse({ hide_mode: 'seasonal' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown hide_mode value', () => {
    const result = storeVisibilityPatchSchema.safeParse({ hide_mode: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('rejects missing hide_mode', () => {
    const result = storeVisibilityPatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects seasonal with end date only', () => {
    const result = storeVisibilityPatchSchema.safeParse({
      hide_mode: 'seasonal',
      seasonal_hide_end: '03-31',
    });
    expect(result.success).toBe(false);
  });
});
