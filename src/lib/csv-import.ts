/**
 * CSV import shared utilities — used by store and blog import routes.
 *
 * Core rules:
 *   - Missing column  → no change to that field
 *   - Empty cell      → no change to that field (same as missing)
 *   - Present cell    → coerce to proper type, validate, include in update
 *   - Unknown column  → ignored silently (forward-compatible; warnings surfaced in preview)
 */
import Papa from 'papaparse';
import { V3_CSV_COLUMNS, type V3StoreData } from './v3-types';

// ─── Type classification for coercion ───

const BOOLEAN_FIELDS = new Set([
  'is_active', 'has_booth', 'estimate_enabled', 'qr_code_enabled',
]);

const NUMBER_FIELDS = new Set([
  'lat', 'lng', 'parking_spaces', 'discount_rate',
  'price_multiplier', 'min_price_limit',
  'level1_staff_count', 'level2_staff_count',
]);

const JSON_FIELDS = new Set([
  'nearby_stations', 'gallery_images', 'custom_services',
  'page_layout', 'blur_config', 'appeal_points', 'certifications',
  'store_news', 'banners', 'price_overrides', 'guide_config', 'promo_banners',
  'staff_members',
]);

// Image URL fields. These accept either a full URL (kept as-is) or a
// filename referencing an image inside the uploaded ZIP's images/ folder.
export const IMAGE_SINGLE_COLUMNS = new Set<string>([
  'hero_image_url', 'logo_url', 'staff_photo_url',
  'store_exterior_url', 'store_interior_url',
  'before_after_url', 'campaign_banner_url',
]);

// Convenience columns that get assembled into JSON fields.
// banner1..4 → promo_banners JSON (unless promo_banners is explicitly set).
// gallery    → gallery_images JSON (pipe-separated list; explicit gallery_images wins).
// staff_*_1..6 → staff_members JSON (unless staff_members is explicitly set).
export const BANNER_CONVENIENCE_COLUMNS = ['banner1', 'banner2', 'banner3', 'banner4'] as const;
export const GALLERY_CONVENIENCE_COLUMN = 'gallery';

export const STAFF_SLOT_COUNT = 6;
export const STAFF_PHOTO_COLUMNS = Array.from({ length: STAFF_SLOT_COUNT }, (_, i) => `staff_photo_${i + 1}`);
export const STAFF_NAME_COLUMNS = Array.from({ length: STAFF_SLOT_COUNT }, (_, i) => `staff_name_${i + 1}`);
export const STAFF_ROLE_COLUMNS = Array.from({ length: STAFF_SLOT_COUNT }, (_, i) => `staff_role_${i + 1}`);
export const STAFF_BIO_COLUMNS = Array.from({ length: STAFF_SLOT_COUNT }, (_, i) => `staff_bio_${i + 1}`);
export const STAFF_CERT_COLUMNS = Array.from({ length: STAFF_SLOT_COUNT }, (_, i) => `staff_cert_${i + 1}`);
export const STAFF_CONVENIENCE_COLUMNS = [
  ...STAFF_NAME_COLUMNS, ...STAFF_ROLE_COLUMNS, ...STAFF_PHOTO_COLUMNS,
  ...STAFF_BIO_COLUMNS, ...STAFF_CERT_COLUMNS,
];

const KNOWN_STORE_COLUMNS = new Set<string>([
  ...(V3_CSV_COLUMNS as readonly string[]),
  ...BANNER_CONVENIENCE_COLUMNS,
  GALLERY_CONVENIENCE_COLUMN,
  ...STAFF_CONVENIENCE_COLUMNS,
  'staff_members',
]);

/** Columns handled by Phase 6 image resolver; excluded from the generic validate/coerce pipeline. */
const HANDLED_BY_IMAGE_RESOLVER = new Set<string>([
  ...IMAGE_SINGLE_COLUMNS,
  ...BANNER_CONVENIENCE_COLUMNS,
  GALLERY_CONVENIENCE_COLUMN,
  ...STAFF_PHOTO_COLUMNS,
]);

/** Staff text columns are assembled into staff_members JSON (separate from generic coerce). */
const HANDLED_BY_STAFF_ASSEMBLER = new Set<string>([
  ...STAFF_NAME_COLUMNS, ...STAFF_ROLE_COLUMNS, ...STAFF_BIO_COLUMNS, ...STAFF_CERT_COLUMNS,
]);

// ─── Coercion ───

type CoerceResult = { value: unknown } | { error: string } | null;

/** Coerce a single CSV cell to the proper JS type. Returns null if the cell should be skipped. */
export function coerceCell(field: string, raw: string): CoerceResult {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  if (BOOLEAN_FIELDS.has(field)) {
    const lower = trimmed.toLowerCase();
    if (['true', 'yes', '1'].includes(lower)) return { value: true };
    if (['false', 'no', '0'].includes(lower)) return { value: false };
    return { error: `"${field}" must be true/false (got "${trimmed}")` };
  }

  if (NUMBER_FIELDS.has(field)) {
    const n = Number(trimmed);
    if (isNaN(n)) return { error: `"${field}" is not a valid number: "${trimmed}"` };
    return { value: n };
  }

  if (JSON_FIELDS.has(field)) {
    try {
      JSON.parse(trimmed);
      return { value: trimmed };
    } catch {
      return { error: `"${field}" is not valid JSON: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '…' : ''}"` };
    }
  }

  return { value: trimmed };
}

// ─── Row validation ───

export type RowResult = {
  rowNumber: number;
  storeId: string | null;
  updates: Partial<V3StoreData>;
  errors: string[];
  warnings: string[];
  unknownColumns: string[];
};

export function validateStoreRow(row: Record<string, string>, rowNumber: number): RowResult {
  const storeId = row.store_id?.trim() || null;
  const updates: Record<string, unknown> = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  const unknownColumns: string[] = [];

  if (!storeId) {
    errors.push('store_id is required');
  }

  for (const [col, val] of Object.entries(row)) {
    if (col === 'store_id') continue;
    if (!KNOWN_STORE_COLUMNS.has(col)) {
      unknownColumns.push(col);
      continue;
    }
    // Image + convenience columns are resolved separately (resolveImageRefs)
    if (HANDLED_BY_IMAGE_RESOLVER.has(col)) continue;
    if (HANDLED_BY_STAFF_ASSEMBLER.has(col)) continue;
    const res = coerceCell(col, val);
    if (res === null) continue;
    if ('error' in res) {
      errors.push(res.error);
      continue;
    }
    updates[col] = res.value;
  }

  return {
    rowNumber,
    storeId,
    updates: updates as Partial<V3StoreData>,
    errors,
    warnings,
    unknownColumns,
  };
}

// ─── Parsing ───

export type ParsedCsv = {
  rows: Record<string, string>[];
  columns: string[];
  parseErrors: string[];
};

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v : String(v)),
  });
  return {
    rows: result.data,
    columns: result.meta.fields || [],
    parseErrors: result.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`),
  };
}

// ─── Diffing ───

export type FieldDiff = { field: string; before: unknown; after: unknown };

export function computeDiff(
  existing: Partial<V3StoreData> | null,
  updates: Partial<V3StoreData>,
): FieldDiff[] {
  const diff: FieldDiff[] = [];
  for (const [field, newVal] of Object.entries(updates)) {
    const oldVal = existing ? (existing as Record<string, unknown>)[field] : undefined;
    if (oldVal !== newVal) {
      diff.push({ field, before: oldVal ?? null, after: newVal });
    }
  }
  return diff;
}

// ─── Image reference extraction (Phase 6: ZIP bundle + URL) ───

export type ImageRef = { field: string; value: string };

export type ExtractedImages = {
  /** Single-slot image columns: hero_image_url, logo_url, ... */
  singles: ImageRef[];
  /** banner1..banner4 (sparse — only slots with values present). */
  banners: { slot: 1 | 2 | 3 | 4; value: string }[];
  /** gallery convenience column, pipe-separated values. */
  gallery: string[];
  /** Explicit JSON cell in `promo_banners` (takes precedence over banner1..4). */
  explicitPromoBannersJson?: string;
  /** Explicit JSON cell in `gallery_images` (takes precedence over gallery). */
  explicitGalleryJson?: string;
  /** staff_photo_1..6 (sparse — only slots with values present). */
  staffPhotos: { slot: number; value: string }[];
  /** Per-slot text fields: name/role/bio/cert (already coerced strings, may be empty). */
  staffText: Array<{ slot: number; name: string; role: string; bio: string; cert: string }>;
  /** Explicit JSON cell in `staff_members` (takes precedence over per-slot columns). */
  explicitStaffMembersJson?: string;
};

/** Extract raw image references from a CSV row. Does not resolve/upload. */
export function extractImageRefs(row: Record<string, string>): ExtractedImages {
  const singles: ImageRef[] = [];
  for (const field of IMAGE_SINGLE_COLUMNS) {
    const v = row[field]?.trim();
    if (v) singles.push({ field, value: v });
  }

  const banners: { slot: 1 | 2 | 3 | 4; value: string }[] = [];
  BANNER_CONVENIENCE_COLUMNS.forEach((col, i) => {
    const v = row[col]?.trim();
    if (v) banners.push({ slot: (i + 1) as 1 | 2 | 3 | 4, value: v });
  });

  const galleryRaw = row[GALLERY_CONVENIENCE_COLUMN]?.trim();
  const gallery = galleryRaw ? galleryRaw.split('|').map((s) => s.trim()).filter(Boolean) : [];

  const explicitPromoBannersJson = row.promo_banners?.trim() || undefined;
  const explicitGalleryJson = row.gallery_images?.trim() || undefined;

  const staffPhotos: { slot: number; value: string }[] = [];
  STAFF_PHOTO_COLUMNS.forEach((col, i) => {
    const v = row[col]?.trim();
    if (v) staffPhotos.push({ slot: i + 1, value: v });
  });

  const staffText: Array<{ slot: number; name: string; role: string; bio: string; cert: string }> = [];
  for (let i = 0; i < STAFF_SLOT_COUNT; i++) {
    const slot = i + 1;
    const name = row[STAFF_NAME_COLUMNS[i]]?.trim() || '';
    const role = row[STAFF_ROLE_COLUMNS[i]]?.trim() || '';
    const bio = row[STAFF_BIO_COLUMNS[i]]?.trim() || '';
    const cert = row[STAFF_CERT_COLUMNS[i]]?.trim() || '';
    if (name || role || bio || cert) staffText.push({ slot, name, role, bio, cert });
  }

  const explicitStaffMembersJson = row.staff_members?.trim() || undefined;

  return {
    singles, banners, gallery, explicitPromoBannersJson, explicitGalleryJson,
    staffPhotos, staffText, explicitStaffMembersJson,
  };
}

/** Classify a single image value: full URL, filename (needs ZIP lookup), or empty. */
export function classifyImageValue(value: string): 'url' | 'file' | 'empty' {
  const t = value.trim();
  if (!t) return 'empty';
  if (/^https?:\/\//i.test(t)) return 'url';
  return 'file';
}

// ─── Blog validation (Phase 7) ───

export const BLOG_CSV_COLUMNS = [
  'slug', 'title', 'summary', 'content', 'hero_image',
  'category', 'published', 'publishDate', 'metaTitle', 'metaDescription',
] as const;

const BLOG_BOOLEAN_FIELDS = new Set(['published']);
const BLOG_KNOWN_COLUMNS = new Set<string>(BLOG_CSV_COLUMNS as readonly string[]);
const BLOG_IMAGE_FIELD = 'hero_image'; // resolved to hero_image_url in Firestore

export type BlogRowResult = {
  rowNumber: number;
  slug: string | null;
  updates: Record<string, unknown>;
  heroImageRaw: string | null; // raw CSV value (URL or filename), null if empty
  errors: string[];
  unknownColumns: string[];
};

export function validateBlogRow(row: Record<string, string>, rowNumber: number): BlogRowResult {
  const slug = row.slug?.trim() || null;
  const updates: Record<string, unknown> = {};
  const errors: string[] = [];
  const unknownColumns: string[] = [];
  let heroImageRaw: string | null = null;

  if (!slug) errors.push('slug is required');
  else if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    errors.push('slug must be URL-safe (alphanumeric and dashes only)');
  }

  for (const [col, val] of Object.entries(row)) {
    if (col === 'slug') continue;
    if (col === BLOG_IMAGE_FIELD) {
      const t = val.trim();
      if (t) heroImageRaw = t;
      continue;
    }
    if (!BLOG_KNOWN_COLUMNS.has(col)) {
      unknownColumns.push(col);
      continue;
    }
    const trimmed = val.trim();
    if (trimmed === '') continue;

    if (BLOG_BOOLEAN_FIELDS.has(col)) {
      const lower = trimmed.toLowerCase();
      if (['true', 'yes', '1'].includes(lower)) updates[col] = true;
      else if (['false', 'no', '0'].includes(lower)) updates[col] = false;
      else errors.push(`"${col}" must be true/false (got "${trimmed}")`);
      continue;
    }

    updates[col] = trimmed;
  }

  return { rowNumber, slug, updates, heroImageRaw, errors, unknownColumns };
}

// ─── CSV generation (for template download) ───

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return Papa.unparse(
    rows.map((r) => {
      const out: Record<string, string> = {};
      for (const col of columns) {
        const v = r[col];
        out[col] = v == null ? '' : String(v);
      }
      return out;
    }),
    { columns },
  );
}
