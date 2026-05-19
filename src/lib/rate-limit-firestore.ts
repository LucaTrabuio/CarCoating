import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RateLimitOptions {
  key: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Firestore-backed rate limiter. Transaction-atomic.
 * Key is stored under rateLimits/{key}.
 * Failures fail-open (to avoid blocking legitimate traffic on Firestore errors).
 */
export async function firestoreRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, maxRequests, windowMs } = opts;

  try {
    const db = getAdminDb();
    const ref = db.collection('rateLimits').doc(key);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!snap.exists) {
        tx.set(ref, {
          count: 1,
          windowStart: now,
          expiresAt: now + windowMs,
        });
        return { count: 1 };
      }

      const data = snap.data()!;

      if (data.windowStart < windowStart) {
        // Window expired — reset
        tx.set(ref, {
          count: 1,
          windowStart: now,
          expiresAt: now + windowMs,
        });
        return { count: 1 };
      }

      const newCount = (data.count as number) + 1;
      tx.update(ref, { count: FieldValue.increment(1) });
      return { count: newCount };
    });

    const remaining = Math.max(0, maxRequests - result.count);
    return { allowed: result.count <= maxRequests, remaining };
  } catch {
    // Fail-open on Firestore errors
    return { allowed: true, remaining: maxRequests };
  }
}
