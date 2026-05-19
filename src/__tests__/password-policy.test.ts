import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  isPasswordExpired,
  daysUntilExpiry,
  generateTempPassword,
  PASSWORD_MAX_AGE_DAYS,
  PASSWORD_MIN_LENGTH,
} from '../lib/password-policy';

describe('validatePassword', () => {
  it('accepts a valid strong password', () => {
    const result = validatePassword('Abcdef1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects password shorter than minimum', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes(`${PASSWORD_MIN_LENGTH}文字`))).toBe(true);
  });

  it('rejects password missing uppercase', () => {
    const result = validatePassword('abcdef1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('大文字'))).toBe(true);
  });

  it('rejects password missing lowercase', () => {
    const result = validatePassword('ABCDEF1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('小文字'))).toBe(true);
  });

  it('rejects password missing digit', () => {
    const result = validatePassword('Abcdefg!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('数字'))).toBe(true);
  });

  it('rejects password missing symbol', () => {
    const result = validatePassword('Abcdef12');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('記号'))).toBe(true);
  });
});

describe('isPasswordExpired', () => {
  it('returns true when no date provided', () => {
    expect(isPasswordExpired(undefined)).toBe(true);
    expect(isPasswordExpired(null)).toBe(true);
  });

  it('returns false for a recently-changed password', () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(isPasswordExpired(recent)).toBe(false);
  });

  it('returns true for a password changed over 90 days ago', () => {
    const old = new Date(Date.now() - (PASSWORD_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    expect(isPasswordExpired(old)).toBe(true);
  });

  it('returns false on the boundary (exactly 90 days - 1 hour)', () => {
    const nearExpiry = new Date(Date.now() - (PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000 - 60 * 60 * 1000)).toISOString();
    expect(isPasswordExpired(nearExpiry)).toBe(false);
  });
});

describe('daysUntilExpiry', () => {
  it('returns 0 when no date provided', () => {
    expect(daysUntilExpiry(undefined)).toBe(0);
  });

  it('returns approximate days remaining', () => {
    const changedAt = new Date(Date.now() - 83 * 24 * 60 * 60 * 1000).toISOString();
    const days = daysUntilExpiry(changedAt);
    expect(days).toBeGreaterThan(6);
    expect(days).toBeLessThan(8);
  });
});

describe('generateTempPassword', () => {
  it('generates a password of the correct length', () => {
    const pw = generateTempPassword();
    expect(pw.length).toBe(14);
  });

  it('satisfies all character requirements', () => {
    for (let i = 0; i < 100; i++) {
      const pw = generateTempPassword();
      const result = validatePassword(pw);
      expect(result.valid, `password "${pw}" failed: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  it('generates unique passwords (no two identical in 100 iterations)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(generateTempPassword());
    expect(set.size).toBe(100);
  });
});
