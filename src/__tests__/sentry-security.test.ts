import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { getRequestSecurityContext, detectSuspiciousPatterns } from '../lib/sentry-security';

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe('getRequestSecurityContext', () => {
  it('returns only method, path, ip keys', () => {
    const req = makeRequest('https://example.com/api/reservation');
    const ctx = getRequestSecurityContext(req);
    const keys = Object.keys(ctx).sort();
    expect(keys).toEqual(['ip', 'method', 'path']);
  });

  it('extracts method and path correctly', () => {
    const req = makeRequest('https://example.com/api/reservation', {});
    const ctx = getRequestSecurityContext(req);
    expect(ctx.method).toBe('GET');
    expect(ctx.path).toBe('/api/reservation');
  });

  it('returns ip from cf-connecting-ip (highest priority)', () => {
    const req = makeRequest('https://example.com/', {
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '9.9.9.9',
    });
    const ctx = getRequestSecurityContext(req);
    expect(ctx.ip).toBe('1.2.3.4');
  });

  it('falls back to x-vercel-forwarded-for when no cf-connecting-ip', () => {
    const req = makeRequest('https://example.com/', {
      'x-vercel-forwarded-for': '5.6.7.8, 1.1.1.1',
      'x-forwarded-for': '9.9.9.9',
    });
    const ctx = getRequestSecurityContext(req);
    expect(ctx.ip).toBe('5.6.7.8');
  });

  it('falls back to x-forwarded-for first value', () => {
    const req = makeRequest('https://example.com/', {
      'x-forwarded-for': '10.0.0.1, 10.0.0.2',
    });
    const ctx = getRequestSecurityContext(req);
    expect(ctx.ip).toBe('10.0.0.1');
  });

  it('returns unknown when no ip headers present', () => {
    const req = makeRequest('https://example.com/');
    const ctx = getRequestSecurityContext(req);
    expect(ctx.ip).toBe('unknown');
  });

  it('does not include headers or cookies in returned context', () => {
    const req = makeRequest('https://example.com/', {
      cookie: '__session=abc',
      authorization: 'Bearer tok',
    });
    const ctx = getRequestSecurityContext(req);
    const json = JSON.stringify(ctx);
    expect(json).not.toContain('__session');
    expect(json).not.toContain('Bearer');
    expect(json).not.toContain('cookie');
    expect(json).not.toContain('authorization');
  });
});

describe('detectSuspiciousPatterns', () => {
  it('detects SQL injection: OR tautology', () => {
    const result = detectSuspiciousPatterns("' OR 1=1--");
    expect(result).toContain('sql_injection');
  });

  it('detects SQL injection: UNION SELECT', () => {
    const result = detectSuspiciousPatterns('UNION SELECT * FROM users');
    expect(result).toContain('sql_injection');
  });

  it('detects XSS: script tag', () => {
    const result = detectSuspiciousPatterns('<script>alert(1)</script>');
    expect(result).toContain('xss');
  });

  it('detects XSS: onerror attribute', () => {
    const result = detectSuspiciousPatterns('x onerror=alert(1)');
    expect(result).toContain('xss');
  });

  it('returns empty array for clean strings', () => {
    expect(detectSuspiciousPatterns('トヨタ カローラ')).toEqual([]);
    expect(detectSuspiciousPatterns('Hello, how are you?')).toEqual([]);
    expect(detectSuspiciousPatterns('user@example.com')).toEqual([]);
  });

  it('returns empty array for clean objects', () => {
    const clean = { name: 'Yamada Taro', notes: 'Please call me in the afternoon' };
    expect(detectSuspiciousPatterns(clean)).toEqual([]);
  });

  it('walks nested objects to find patterns', () => {
    const nested = { outer: { inner: '<script>evil()</script>' } };
    const result = detectSuspiciousPatterns(nested);
    expect(result).toContain('xss');
  });

  it('deduplicates matched rule names', () => {
    const input = ["' OR 1=1--", "' OR 2=2--"];
    const result = detectSuspiciousPatterns(input);
    expect(result.filter((r) => r === 'sql_injection').length).toBe(1);
  });
});
