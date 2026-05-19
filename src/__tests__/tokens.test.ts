import { describe, it, expect } from 'vitest';
import { generateToken, hashToken } from '../lib/tokens';

describe('generateToken', () => {
  it('generates a hex string of correct length', () => {
    const token = generateToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) tokens.add(generateToken());
    expect(tokens.size).toBe(50);
  });

  it('respects custom byteLength', () => {
    const token = generateToken(16);
    expect(token.length).toBe(32);
  });
});

describe('hashToken', () => {
  it('produces a 64-char hex string (SHA-256)', () => {
    const hash = hashToken('some-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('def'));
  });
});
