import { z } from 'zod';
import { isReservedStoreSlug } from './store-url';

// ─── Constants ───

export const MM_DD_REGEX = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

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
  store_slug: z.string().max(100).refine(
    val => val === undefined || val === '' || !isReservedStoreSlug(val),
    { message: 'store_slug must not be a reserved sub-page name' },
  ).optional(),
  custom_css: z.string().max(10000).optional(),
  estimate_enabled: z.boolean().optional(),
  qr_code_enabled: z.boolean().optional(),
  font_family: z.string().max(50).optional(),
  price_overrides: jsonString.optional(),
  guide_config: jsonString.optional(),
  promo_banners: jsonString.optional(),
  staff_members: jsonString.optional(),
  override_flags: jsonString.optional(),

  // Market segmentation
  shouken_group: z.string().max(200).optional(),
  local_market_area: z.string().max(200).optional(),

  // Visibility controls (intentionally excluded from the general write schema —
  // callers must use storeVisibilityPatchSchema for these fields)
});

export type V3StoreWriteInput = z.infer<typeof v3StoreWriteSchema>;

/** Partial schema for PUT updates — store_id is still required */
export const v3StorePartialSchema = v3StoreWriteSchema.partial().extend({
  store_id: z.string().min(1).max(100),
});

// ─── Banner Preset Schema ───

export const bannerPresetStructuredSchema = z.object({
  title: z.string().max(500).default(''),
  subtitle: z.string().max(500).default(''),
  image_url: z.string().max(2000).default(''),
  original_price: z.number().min(0).max(100_000_000).default(0),
  discount_rate: z.number().min(0).max(100).default(0),
  link_url: z.string().max(2000).default(''),
  custom_css: z.string().max(20_000).default(''),
});

export const bannerPresetHtmlSchema = z.object({
  html: z.string().max(50_000).default(''),
  css: z.string().max(20_000).default(''),
});

export const bannerPresetCombinedSchema = z.object({
  source: z.string().max(70_000).default(''),
});

export const bannerTemplateFieldSchema = z.object({
  key: z.string().min(1).max(80).regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/, 'key must be alphanumeric/_/-'),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'textarea', 'color', 'number', 'select', 'image_url', 'url']),
  default: z.string().max(2000).default(''),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().max(200)).max(50).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().max(10).optional(),
  editable: z.boolean().optional(),
  origin: z.enum(['html', 'css']).optional(),
});

export const bannerPresetWriteSchema = z.object({
  name: z.string().min(1).max(200),
  scope: z.enum(['global', 'store']),
  owner_store_id: z.string().max(100).default(''),
  mode: z.enum(['structured', 'html', 'combined']),
  preview_image_url: z.string().max(2000).default(''),
  structured: bannerPresetStructuredSchema.default({} as never),
  html_content: bannerPresetHtmlSchema.default({} as never),
  combined_content: bannerPresetCombinedSchema.default({} as never),
  is_template: z.boolean().default(false),
  fields: z.array(bannerTemplateFieldSchema).max(50).default([]),
});

export type BannerPresetWriteInput = z.infer<typeof bannerPresetWriteSchema>;

// ─── Campaign Defaults Schema ───

export const campaignDefaultsSchema = z.object({
  title: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discount: z.number().min(0).max(100),
  font: z.string().max(50).optional(),
  force_hq_campaign: z.boolean().optional(),
});

// ─── Blog Post Schema (POST /api/admin/blog) ───

export const blogPostWriteSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*$/, 'slug must be lowercase alphanumeric with hyphens'),
  content: z.string().max(200_000).default(''),
  published: z.boolean().default(false),
  summary: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metaTitle: z.string().max(300).optional(),
  metaDescription: z.string().max(500).optional(),
  hero_image_url: z.string().url().max(2000).optional(),
  sections: z.array(z.object({
    heading: z.string().max(300),
    text: z.string().max(50_000),
  })).max(50).optional(),
});

// ─── Booking PATCH Schema ───

export const bookingPatchSchema = z.object({
  reservationId: z.string().min(1).max(200),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  confirmChoiceIndex: z.number().int().min(0).max(20).optional(),
  adminMessage: z.string().max(2000).optional(),
});

// ─── Inquiry PATCH Schema ───

export const inquiryPatchSchema = z.object({
  inquiryId: z.string().min(1).max(200),
  status: z.enum(['open', 'replied', 'closed']),
  replyText: z.string().max(10_000).optional(),
});

// ─── Ticket Action Schema (POST /api/admin/tickets) ───

export const ticketActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    subject: z.string().min(1).max(300),
    text: z.string().min(1).max(20_000),
    storeId: z.string().max(100).optional(),
    type: z.string().max(50).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }),
  z.object({
    action: z.literal('reply'),
    ticketId: z.string().min(1).max(200),
    text: z.string().min(1).max(20_000),
  }),
  z.object({
    action: z.literal('status'),
    ticketId: z.string().min(1).max(200),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  }),
  z.object({
    action: z.literal('edit'),
    ticketId: z.string().min(1).max(200),
    subject: z.string().min(1).max(300),
  }),
  z.object({
    action: z.literal('delete'),
    ticketId: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal('delete_message'),
    ticketId: z.string().min(1).max(200),
    messageIndex: z.number().int().min(0).max(10_000),
  }),
]);

// ─── Store Visibility Patch Schema ───

const mmDdString = z.string().regex(MM_DD_REGEX, 'Must be MM-DD (e.g. 03-31)');

export const storeVisibilityPatchSchema = z.discriminatedUnion('hide_mode', [
  z.object({
    hide_mode: z.literal('manual'),
  }),
  z.object({
    hide_mode: z.literal('seasonal'),
    seasonal_hide_start: mmDdString,
    seasonal_hide_end: mmDdString,
  }),
  z.object({
    hide_mode: z.null(),
  }),
]);

export type StoreVisibilityPatchInput = z.infer<typeof storeVisibilityPatchSchema>;

// ─── Security / Password Schemas ───

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(300),
}).strict();

export const passwordChangedHookSchema = z.object({}).strict();

export const stepUpSchema = z.object({
  method: z.enum(['password', 'google-recent-auth']),
  password: z.string().min(1).max(200).optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
}).strict();

export const superAdminResetUserSchema = z.object({
  deliveryMode: z.enum(['email', 'shown']),
}).strict();

export const customerListQuerySchema = z
  .object({
    storeId: z.string().min(1).max(100).optional(),
    allStores: z.coerce.boolean().optional(),
    q: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .refine(
    (data) => Boolean(data.storeId) !== Boolean(data.allStores),
    { message: 'Provide exactly one of storeId or allStores' },
  );

export const customerDetailParamsSchema = z.object({
  storeId: z.string().min(1).max(100),
});

export const createAdminUserSchema = z.object({
  email: z.string().email().max(300),
  displayName: z.string().min(1).max(200),
  role: z.enum(['super_admin', 'store_admin']),
  managedStores: z.array(z.string().max(100)).max(500).default([]),
}).strict();

// ─── Notification Opt-In Schema ───

export const notificationOptInSchema = z.object({
  optIn: z.boolean(),
}).strict();

// ─── Cron Empty Body Schema (passthrough so GET-style crons can import) ───

export const cronEmptyBodySchema = z.object({}).passthrough();

// ─── Keeper Survey Sync Schema ───

export const keeperSyncRequestSchema = z
  .object({ full: z.boolean().optional() })
  .strict();

// ─── Area Layout Write Schema ───

export const areaLayoutWriteSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().min(1).max(200),
      type: z.string().min(1).max(100),
      label: z.string().max(200).default(''),
      visible: z.boolean().default(true),
      order: z.number().int().min(0).default(0),
      config: z.record(z.string(), z.unknown()).default({}),
    }),
  ).max(50),
});

// ─── Reservation Request Schema ───

export const reservationRequestSchema = z
  .object({
    type: z.enum(['visit', 'inquiry'], { message: 'type must be "visit" or "inquiry"' }),
    // .trim() must precede .min(1): the old route checked name.trim()/storeId.trim()
    // so a whitespace-only value 400'd. With .min(1).trim() Zod runs min BEFORE the
    // trim transform, letting "   " through — reordering restores the old behaviour.
    storeId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    email: z
      .string()
      .trim()
      .min(1)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    notes: z.string().optional(),
    vehicleInfo: z.string().optional(),
    selectedCoatings: z.array(z.string()).optional(),
    selectedOptions: z.array(z.string()).optional(),
    autoConfirm: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'visit') {
      if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'valid date is required (YYYY-MM-DD)',
          path: ['date'],
        });
        return;
      }
      if (!data.time || !/^\d{2}:\d{2}$/.test(data.time)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'valid time is required (HH:MM)',
          path: ['time'],
        });
        return;
      }
      const parsed = new Date(`${data.date}T${data.time}:00+09:00`);
      if (isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid date or time value',
          path: ['date'],
        });
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Booking must be in the future',
          path: ['date'],
        });
      }
    }
  });

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
