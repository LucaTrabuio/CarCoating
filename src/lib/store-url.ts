export const RESERVED_STORE_SLUGS: readonly string[] = [
  'guide',
  'access',
  'coatings',
  'price',
  'options',
  'booking',
  'inquiry',
  'reviews',
  'cases',
  'news',
  'privacy',
] as const;

export function isReservedStoreSlug(slug: string): boolean {
  return (RESERVED_STORE_SLUGS as readonly string[]).includes(slug);
}

/**
 * Single source of truth for public store URL shape.
 * - Area members (sub_company_id set + store_slug present + areaSlug provided)
 *   → /{areaSlug}/{store_slug}
 * - Standalone stores (no sub_company_id, or areaSlug missing)
 *   → /{store_id}  (flat fallback)
 *
 * Pure function — no firebase imports, safe to import from client and server.
 */
export function storeHref(
  store: { store_id: string; store_slug?: string; sub_company_id?: string },
  areaSlug?: string,
): string {
  if (areaSlug && store.sub_company_id && store.store_slug) {
    return `/${areaSlug}/${store.store_slug}`;
  }
  return `/${store.store_id}`;
}
