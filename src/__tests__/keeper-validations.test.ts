import { describe, it, expect } from 'vitest';
import { keeperSyncRequestSchema } from '../lib/validations';

describe('keeperSyncRequestSchema', () => {
  it('accepts empty object', () => {
    expect(() => keeperSyncRequestSchema.parse({})).not.toThrow();
  });

  it('accepts { full: true }', () => {
    const result = keeperSyncRequestSchema.parse({ full: true });
    expect(result.full).toBe(true);
  });

  it('accepts { full: false }', () => {
    const result = keeperSyncRequestSchema.parse({ full: false });
    expect(result.full).toBe(false);
  });

  it('accepts omitted full (undefined)', () => {
    const result = keeperSyncRequestSchema.parse({});
    expect(result.full).toBeUndefined();
  });

  it('rejects non-boolean full', () => {
    expect(() =>
      keeperSyncRequestSchema.parse({ full: 'yes' }),
    ).toThrow();
    expect(() =>
      keeperSyncRequestSchema.parse({ full: 1 }),
    ).toThrow();
    expect(() =>
      keeperSyncRequestSchema.parse({ full: null }),
    ).toThrow();
  });

  it('rejects unknown extra keys (strict)', () => {
    expect(() =>
      keeperSyncRequestSchema.parse({ full: true, extra: 'field' }),
    ).toThrow();
  });
});
