/**
 * Sanitize a dedupeKey so it's safe to use as a document ID across common
 * key/value stores (Firestore, Postgres rowid, Redis key). Keeps alphanumerics
 * plus a small set of separators (`_`, `:`, `-`); replaces everything else
 * with `_`. Truncates to 200 chars defensively.
 */
export function sanitizeDedupeKey(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 200);
}
