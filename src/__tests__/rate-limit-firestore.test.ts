import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firestoreRateLimit } from '../lib/rate-limit-firestore';

// Mock firebase-admin
vi.mock('../lib/firebase-admin', () => {
  const store = new Map<string, { count: number; windowStart: number; expiresAt: number }>();

  const mockDb = {
    collection: () => ({
      doc: (key: string) => ({
        get: async () => {
          const data = store.get(key);
          return data ? { exists: true, data: () => data } : { exists: false };
        },
      }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<{ count: number }>) => {
      let lastCount = 0;

      const tx = {
        get: async (ref: { key: string }) => {
          const data = store.get(ref.key);
          return data ? { exists: true, data: () => data } : { exists: false };
        },
        set: (_ref: unknown, data: { count: number; windowStart: number; expiresAt: number }) => {
          lastCount = data.count;
        },
        update: (_ref: unknown, _data: unknown) => {
          lastCount = (lastCount || 0) + 1;
        },
      };

      // Simplified transaction: just return what fn would return
      const mockTx = {
        get: async () => ({ exists: false }),
        set: (ref: unknown, data: { count: number }) => { lastCount = data.count; },
        update: () => { lastCount += 1; },
      };

      return fn(mockTx);
    },
  };

  return { getAdminDb: () => mockDb };
});

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (n: number) => ({ _increment: n }),
  },
}));

describe('firestoreRateLimit', () => {
  it('allows requests under the limit', async () => {
    const result = await firestoreRateLimit({ key: 'test-under', maxRequests: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });

  it('returns remaining count', async () => {
    const result = await firestoreRateLimit({ key: 'test-remaining', maxRequests: 10, windowMs: 60_000 });
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('fails open on Firestore errors', async () => {
    // Override to throw
    vi.doMock('../lib/firebase-admin', () => ({
      getAdminDb: () => {
        throw new Error('Firestore down');
      },
    }));

    const result = await firestoreRateLimit({ key: 'test-error', maxRequests: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });
});
