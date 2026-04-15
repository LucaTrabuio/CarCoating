export const KEEPER_BASE = 'https://www.keepercoating.jp';
export const MAX_CSV_ROWS = 2000;
export const MAX_BATCH_STORES = 500;

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/** Canonical site URL — used in emails, sitemap, robots, OG metadata. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://car-coating.vercel.app';
