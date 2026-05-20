import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyCronAuth } from '../lib/cron-auth';

const ORIGINAL = process.env.CRON_SECRET;

describe('verifyCronAuth', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'super-secret-cron-token';
  });
  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL;
  });

  it('accepts the exact Bearer header', () => {
    expect(verifyCronAuth('Bearer super-secret-cron-token')).toBe(true);
  });

  it('rejects a wrong token', () => {
    expect(verifyCronAuth('Bearer wrong-token')).toBe(false);
  });

  it('rejects a token of the same length but different bytes', () => {
    // Same length as the secret — guards against length-only comparison.
    expect(verifyCronAuth('Bearer xxxxx-xxxxx-xxxx-xxxxx')).toBe(false);
  });

  it('rejects a missing scheme', () => {
    expect(verifyCronAuth('super-secret-cron-token')).toBe(false);
  });

  it('rejects a null header (fail-closed)', () => {
    expect(verifyCronAuth(null)).toBe(false);
  });

  it('rejects an empty header', () => {
    expect(verifyCronAuth('')).toBe(false);
  });

  it('fails closed when CRON_SECRET is unset', () => {
    delete process.env.CRON_SECRET;
    expect(verifyCronAuth('Bearer super-secret-cron-token')).toBe(false);
    expect(verifyCronAuth('Bearer ')).toBe(false);
  });
});
