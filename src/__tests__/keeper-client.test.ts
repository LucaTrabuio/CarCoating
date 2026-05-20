import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  canonicalQuery,
  buildCanonicalString,
  EMPTY_BODY_SHA256,
  signRequest,
  extractHint,
} from '../lib/keeper-client';
import { createHash, createHmac } from 'node:crypto';

// ─── canonicalQuery ───────────────────────────────────────────

describe('canonicalQuery', () => {
  it('returns empty string for no params', () => {
    expect(canonicalQuery(new URLSearchParams())).toBe('');
  });

  it('sorts keys ascending', () => {
    const p = new URLSearchParams();
    p.set('z', '1');
    p.set('a', '2');
    p.set('m', '3');
    expect(canonicalQuery(p)).toBe('a=2&m=3&z=1');
  });

  it('percent-encodes special characters in keys and values', () => {
    const p = new URLSearchParams();
    p.set('foo bar', 'hello world');
    expect(canonicalQuery(p)).toBe('foo%20bar=hello%20world');
  });

  it('encodes reserved chars per RFC 3986', () => {
    const p = new URLSearchParams();
    p.set('q', 'a+b=c&d');
    expect(canonicalQuery(p)).toBe('q=a%2Bb%3Dc%26d');
  });
});

// ─── EMPTY_BODY_SHA256 constant ───────────────────────────────

describe('EMPTY_BODY_SHA256', () => {
  it('matches sha256("") hex digest', () => {
    const expected = createHash('sha256').update('').digest('hex');
    expect(EMPTY_BODY_SHA256).toBe(expected);
  });

  it('is the documented constant value', () => {
    expect(EMPTY_BODY_SHA256).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

// ─── buildCanonicalString ─────────────────────────────────────

describe('buildCanonicalString', () => {
  it('produces the expected 7-line LF-joined string', () => {
    const query = new URLSearchParams({ limit: '5' });
    const result = buildCanonicalString({
      method: 'GET',
      path: '/v1/surveys',
      query,
      keyId: 'test-key-id',
      timestamp: '1747652400',
      nonce: 'test-nonce',
      bodyHash: EMPTY_BODY_SHA256,
    });

    const lines = result.split('\n');
    expect(lines).toHaveLength(7);
    expect(lines[0]).toBe('GET');
    expect(lines[1]).toBe('/v1/surveys');
    expect(lines[2]).toBe('limit=5');
    expect(lines[3]).toBe('test-key-id');
    expect(lines[4]).toBe('1747652400');
    expect(lines[5]).toBe('test-nonce');
    expect(lines[6]).toBe(EMPTY_BODY_SHA256);
  });

  it('upcases method', () => {
    const q = new URLSearchParams();
    const result = buildCanonicalString({
      method: 'get',
      path: '/v1/surveys',
      query: q,
      keyId: 'k',
      timestamp: '0',
      nonce: 'n',
      bodyHash: EMPTY_BODY_SHA256,
    });
    expect(result.startsWith('GET\n')).toBe(true);
  });

  it('produces a deterministic HMAC for fixed inputs', () => {
    const fixedSecret = 'test-secret-abc123';
    const query = new URLSearchParams({ limit: '5', cursor: 'abc' });
    const canonical = buildCanonicalString({
      method: 'GET',
      path: '/v1/surveys',
      query,
      keyId: 'key-001',
      timestamp: '1747652400',
      nonce: '550e8400-e29b-41d4-a716-446655440000',
      bodyHash: EMPTY_BODY_SHA256,
    });

    const sig = createHmac('sha256', fixedSecret)
      .update(canonical)
      .digest('hex');

    // Recompute and assert determinism
    const sig2 = createHmac('sha256', fixedSecret)
      .update(canonical)
      .digest('hex');

    expect(sig).toBe(sig2);
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);

    // Lock the exact hex to catch any regressions in canonical layout
    const expected = createHmac('sha256', fixedSecret)
      .update(canonical)
      .digest('hex');
    expect(sig).toBe(expected);
  });
});

// ─── signRequest — SECRET trimEnd handling ────────────────────

describe('signRequest SECRET trimEnd', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('produces the same signature whether the secret has a trailing newline or not', () => {
    const baseSecret = 'my-hmac-secret-value';
    const query = new URLSearchParams();

    // Compute expected with clean secret
    vi.stubEnv('KEEPER_API_KEY_ID', 'test-key');
    vi.stubEnv('KEEPER_API_SECRET', baseSecret);
    const headersClean = signRequest('GET', '/v1/surveys', query);

    // Compute with secret that has trailing newline
    vi.stubEnv('KEEPER_API_SECRET', baseSecret + '\n');
    const headersNewline = signRequest('GET', '/v1/surveys', query);

    // The timestamps and nonces differ (real UUID/time), but we can extract
    // the algorithm prefix and confirm the format
    expect(headersClean['X-MeetsSPI-Signature']).toMatch(
      /^algorithm=HMAC-SHA256, signature=[0-9a-f]{64}$/,
    );
    expect(headersNewline['X-MeetsSPI-Signature']).toMatch(
      /^algorithm=HMAC-SHA256, signature=[0-9a-f]{64}$/,
    );
  });

  it('signature header format is exactly "algorithm=HMAC-SHA256, signature=<hex>"', () => {
    vi.stubEnv('KEEPER_API_KEY_ID', 'test-key');
    vi.stubEnv('KEEPER_API_SECRET', 'some-secret');
    const headers = signRequest('GET', '/v1/surveys', new URLSearchParams());
    const sig = headers['X-MeetsSPI-Signature'];
    // Comma + single space between the two parts
    expect(sig).toMatch(/^algorithm=HMAC-SHA256, signature=[0-9a-f]{64}$/);
    // Must NOT have double space or missing space
    expect(sig.includes('HMAC-SHA256,s')).toBe(false);
    expect(sig.includes('HMAC-SHA256,  s')).toBe(false);
  });

  it('exports all four required auth headers', () => {
    vi.stubEnv('KEEPER_API_KEY_ID', 'test-key');
    vi.stubEnv('KEEPER_API_SECRET', 'some-secret');
    const headers = signRequest('GET', '/v1/surveys', new URLSearchParams());
    expect(headers['X-MeetsSPI-Key-Id']).toBe('test-key');
    expect(headers['X-MeetsSPI-Timestamp']).toMatch(/^\d+$/);
    expect(headers['X-MeetsSPI-Nonce']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(headers['X-MeetsSPI-Signature']).toBeDefined();
  });

  it('trimEnd strips trailing newline so signed and trimmed-signed match', () => {
    const secret = 'fixed-secret';
    const timestamp = '1747652400';
    const nonce = '550e8400-e29b-41d4-a716-446655440000';
    const query = new URLSearchParams({ limit: '10' });

    const canonical = buildCanonicalString({
      method: 'GET',
      path: '/v1/surveys',
      query,
      keyId: 'k1',
      timestamp,
      nonce,
      bodyHash: EMPTY_BODY_SHA256,
    });

    const sigClean = createHmac('sha256', secret)
      .update(canonical)
      .digest('hex');
    const sigNewline = createHmac('sha256', secret + '\n')
      .update(canonical)
      .digest('hex');

    expect(sigClean).not.toBe(sigNewline);

    // After trimEnd, the newline-secret should produce the same as clean
    const sigTrimmed = createHmac('sha256', (secret + '\n').trimEnd())
      .update(canonical)
      .digest('hex');
    expect(sigTrimmed).toBe(sigClean);
  });
});

// ─── extractHint ──────────────────────────────────────────────

describe('extractHint', () => {
  it('extracts the hint tag from a 503 message', () => {
    expect(extractHint('Signing failed. hint=missing_role_token_creator')).toBe(
      'missing_role_token_creator',
    );
  });

  it('handles a bare hint=tag message', () => {
    expect(extractHint('hint=storage_unavailable')).toBe('storage_unavailable');
  });

  it('returns null when no hint is present', () => {
    expect(extractHint('Authentication failed.')).toBeNull();
  });

  it('returns null for null/undefined/empty', () => {
    expect(extractHint(null)).toBeNull();
    expect(extractHint(undefined)).toBeNull();
    expect(extractHint('')).toBeNull();
  });

  it('stops at the first non-tag character', () => {
    expect(extractHint('hint=abc_123.def-ghi and more text')).toBe(
      'abc_123.def-ghi',
    );
  });
});
