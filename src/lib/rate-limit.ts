const windowMs = 60_000; // 1 minute window
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory sliding-window rate limiter.
 * Resets on cold start — adequate for basic protection.
 * For production-grade limiting, use Upstash Redis.
 */
export function rateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}

/** Extract client IP from request headers */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
