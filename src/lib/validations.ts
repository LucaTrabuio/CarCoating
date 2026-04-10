import { z } from 'zod';

// ─── Helpers ───

/** Validates that a non-empty string is valid JSON */
const jsonString = z.string().max(10000).refine(
  (val) => {
    if (!val || val === '[]' || val === '{}') return true;
    try { JSON.parse(val); return true; } catch { return false; }
  },
  { message: 'Must be a valid JSON string' },
);

const optionalString = z.string().max(500).default('');
const optionalLongString = z.string().max(5000).default('');

// ─── V3 Store Schema ───

export const v3StoreWriteSchema = z.object({
  // Identity
  store_id: z.string().min(1).max(100),
  store_name: z.string().min(1).max(200),
  is_active: z.boolean().default(true),

  // Contact
  address: optionalString,
  postal_code: optionalString,
  prefecture: optionalString,
  city: optionalString,
  tel: optionalString,
  business_hours: optionalString,
  regular_holiday: optionalString,
  email: optionalString,
  line_url: optionalString,

  // Location
  lat: z.number().min(-90).max(90).default(0),
  lng: z.number().min(-180).max(180).default(0),
  parking_spaces: z.number().int().min(0).max(9999).default(0),
  landmark: optionalString,
  nearby_stations: jsonString.default('[]'),
  access_map_url: optionalString,

  // Campaign
  campaign_title: optionalString,
  campaign_deadline: optionalString,
  discount_rate: z.number().min(0).max(100).default(20),
  campaign_color_code: optionalString,

  // Custom text
  hero_title: optionalString,
  hero_subtitle: optionalString,
  description: optionalLongString,
  meta_description: optionalString,
  seo_keywords: optionalString,

  // Images
  hero_image_url: optionalString,
  logo_url: optionalString,
  staff_photo_url: optionalString,
  store_exterior_url: optionalString,
  store_interior_url: optionalString,
  before_after_url: optionalString,
  campaign_banner_url: optionalString,
  gallery_images: jsonString.default('[]'),

  // Services & pricing
  custom_services: jsonString.default('[]'),
  price_multiplier: z.number().min(0).max(10).default(1.0),
  min_price_limit: z.number().min(0).default(0),

  // Capabilities
  has_booth: z.boolean().default(false),
  level1_staff_count: z.number().int().min(0).max(999).default(0),
  level2_staff_count: z.number().int().min(0).max(999).default(0),
  google_place_id: optionalString,

  // CMS (optional)
  page_layout: jsonString.optional(),
  blur_config: jsonString.optional(),
  appeal_points: jsonString.optional(),
  certifications: jsonString.optional(),
  store_news: jsonString.optional(),
  banners: jsonString.optional(),
  sub_company_id: z.string().max(100).optional(),
  store_slug: z.string().max(100).optional(),
  custom_css: z.string().max(10000).optional(),
  estimate_enabled: z.boolean().optional(),
  qr_code_enabled: z.boolean().optional(),
  font_family: z.string().max(50).optional(),
  price_overrides: jsonString.optional(),
  guide_config: jsonString.optional(),
});

export type V3StoreWriteInput = z.infer<typeof v3StoreWriteSchema>;

/** Partial schema for PUT updates — store_id is still required */
export const v3StorePartialSchema = v3StoreWriteSchema.partial().extend({
  store_id: z.string().min(1).max(100),
});

// ─── Campaign Defaults Schema ───

export const campaignDefaultsSchema = z.object({
  title: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discount: z.number().min(0).max(100),
  font: z.string().max(50).optional(),
});
