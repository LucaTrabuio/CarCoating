// Shared auth primitive for Vercel Cron routes.
//
// Cron invocations carry no user session, so these routes authenticate via a
// static `Authorization: Bearer ${CRON_SECRET}` header instead of requireAuth.
// Comparison MUST be constant-time: a plain `!==` short-circuits on the first
// differing byte and leaks the secret one character at a time under timing
// analysis. Both sides are SHA-256 hashed to a fixed 32-byte digest first, so
// neither the secret's length nor a per-byte difference is observable, and
// timingSafeEqual never throws on length mismatch.

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Verify a cron request's Authorization header against `CRON_SECRET`.
 * Fail-closed: returns false when `CRON_SECRET` is unset or the header is
 * missing/malformed.
 */
export function verifyCronAuth(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;

  const expected = createHash('sha256').update(`Bearer ${cronSecret}`).digest();
  const actual = createHash('sha256').update(authHeader).digest();
  return timingSafeEqual(expected, actual);
}
