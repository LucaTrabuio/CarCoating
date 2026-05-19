import { describe, it, expect } from 'vitest';
import { notificationOptInSchema } from '../lib/validations';

describe('notificationOptInSchema', () => {
  it('accepts { optIn: true }', () => {
    const result = notificationOptInSchema.safeParse({ optIn: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.optIn).toBe(true);
  });

  it('accepts { optIn: false }', () => {
    const result = notificationOptInSchema.safeParse({ optIn: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.optIn).toBe(false);
  });

  it('rejects missing optIn', () => {
    const result = notificationOptInSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean optIn (string)', () => {
    const result = notificationOptInSchema.safeParse({ optIn: 'true' });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean optIn (number)', () => {
    const result = notificationOptInSchema.safeParse({ optIn: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strict)', () => {
    const result = notificationOptInSchema.safeParse({ optIn: true, extra: 'value' });
    expect(result.success).toBe(false);
  });
});
