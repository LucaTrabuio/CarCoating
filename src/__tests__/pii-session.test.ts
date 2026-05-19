import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mintPiiCookie, verifyPiiToken } from '../lib/pii-session';

// Use a deterministic secret for tests
process.env.PII_SESSION_SECRET = 'test-pii-secret-that-is-long-enough-for-hmac';

describe('pii-session', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mint + verify roundtrip succeeds', () => {
    const { value } = mintPiiCookie('uid-123');
    const payload = verifyPiiToken(value);
    expect(payload).not.toBeNull();
    expect(payload!.uid).toBe('uid-123');
  });

  it('tampered token fails verification', () => {
    const { value } = mintPiiCookie('uid-123');
    const tampered = value.slice(0, -4) + 'xxxx';
    expect(verifyPiiToken(tampered)).toBeNull();
  });

  it('expired token fails verification', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() - 11 * 60 * 1000);
    const { value } = mintPiiCookie('uid-123');
    vi.restoreAllMocks();
    expect(verifyPiiToken(value)).toBeNull();
  });

  it('token with wrong uid fails uid check', () => {
    const { value } = mintPiiCookie('uid-123');
    const payload = verifyPiiToken(value);
    expect(payload?.uid).toBe('uid-123');
    expect(payload?.uid).not.toBe('uid-456');
  });

  it('cookie options include httpOnly and sameSite', () => {
    const { options } = mintPiiCookie('uid-123');
    const opts = options as Record<string, unknown>;
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });
});
