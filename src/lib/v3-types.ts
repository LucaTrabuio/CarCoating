export interface V3StoreData {
  // ─── Identity ───
  store_id: string;
  store_name: string;
  is_active: boolean;

  // ─── Contact ───
  address: string;
  postal_code: string;
  prefecture: string;
  city: string;
  tel: string;
  business_hours: string;
  regular_holiday: string;
  email: string;
  line_url: string;

  // ─── Location ───
  lat: number;
  lng: number;
  parking_spaces: number;
  landmark: string;
  nearby_stations: string; // JSON string: [{name, time}]
  access_map_url: string;

  // ─── Campaign ───
  campaign_title: string;
  campaign_deadline: string;
  discount_rate: number;
  campaign_color_code: string;

  // ─── Custom text ───
  hero_title: string;
  hero_subtitle: string;
  description: string;
  meta_description: string;
  seo_keywords: string;

  // ─── Images (one field per image, Firebase Storage URLs) ───
  hero_image_url: string;       // Hero section background image
  logo_url: string;             // Store logo / branding
  staff_photo_url: string;      // Staff group photo
  store_exterior_url: string;   // Store exterior / building photo
  store_interior_url: string;   // Store interior / booth photo
  before_after_url: string;     // Featured before/after case photo
  campaign_banner_url: string;  // Campaign promotional banner
  gallery_images: string;       // JSON string: ["url1","url2",...] additional photos

  // ─── Services & pricing ───
  custom_services: string; // JSON string for per-store service overrides
  price_multiplier: number; // 1.0 = standard pricing
  min_price_limit: number;

  // ─── Capabilities ───
  has_booth: boolean;
  level1_staff_count: number;
  level2_staff_count: number;
  google_place_id: string;

  // ─── CMS (optional, added for block builder) ───
  page_layout?: string;         // JSON string: PageLayout
  blur_config?: string;         // JSON string: BlurConfig
  appeal_points?: string;       // JSON string: string[] of selected appeal point IDs
  certifications?: string;      // JSON string: Certification[]
  store_news?: string;          // JSON string: StoreNewsItem[]
  banners?: string;             // JSON string: Banner[]
  sub_company_id?: string;      // reference to sub_companies collection
  store_slug?: string;          // URL-friendly slug for new routing
  custom_css?: string;          // per-store custom CSS
  estimate_enabled?: boolean;
  qr_code_enabled?: boolean;
  font_family?: string;         // Font preset ID (e.g., 'noto-serif-jp')
  price_overrides?: string;     // JSON string: { [tierId]: { [size]: number } }
  guide_config?: string;        // JSON string: GuideConfig — hide_prices + per-tier text overrides on the guide page
  promo_banners?: string;       // JSON string: { src: string; alt: string }[] — store-specific promo banner images
  staff_members?: string;       // JSON string: StaffMember[] — overrides Staff block config when set (CSV-driven)
}

/** All CSV columns in order */
export const V3_CSV_COLUMNS: (keyof V3StoreData)[] = [
  'store_id', 'store_name', 'is_active',
  'address', 'postal_code', 'prefecture', 'city',
  'tel', 'business_hours', 'regular_holiday', 'email', 'line_url',
  'lat', 'lng', 'parking_spaces', 'landmark', 'nearby_stations', 'access_map_url',
  'campaign_title', 'campaign_deadline', 'discount_rate', 'campaign_color_code',
  'hero_title', 'hero_subtitle', 'description', 'meta_description', 'seo_keywords',
  'hero_image_url', 'logo_url', 'staff_photo_url', 'store_exterior_url', 'store_interior_url',
  'before_after_url', 'campaign_banner_url', 'gallery_images',
  'custom_services', 'price_multiplier', 'min_price_limit',
  'has_booth', 'level1_staff_count', 'level2_staff_count', 'google_place_id',
  // CMS fields (optional in CSV)
  'page_layout', 'blur_config', 'appeal_points', 'certifications',
  'store_news', 'banners', 'sub_company_id', 'store_slug', 'custom_css',
  'estimate_enabled', 'qr_code_enabled', 'font_family', 'price_overrides', 'guide_config',
];

/** Default values for a new V3 store */
export function defaultV3Store(partial: Partial<V3StoreData> & { store_id: string; store_name: string }): V3StoreData {
  return {
    is_active: true,
    address: '',
    postal_code: '',
    prefecture: '',
    city: '',
    tel: '',
    business_hours: '',
    regular_holiday: '',
    email: '',
    line_url: '',
    lat: 0,
    lng: 0,
    parking_spaces: 0,
    landmark: '',
    nearby_stations: '[]',
    access_map_url: '',
    campaign_title: '',
    campaign_deadline: '',
    discount_rate: 20,
    campaign_color_code: '#F0EA01',
    hero_title: '',
    hero_subtitle: '',
    description: '',
    meta_description: '',
    seo_keywords: '',
    hero_image_url: '',
    logo_url: '',
    staff_photo_url: '',
    store_exterior_url: '',
    store_interior_url: '',
    before_after_url: '',
    campaign_banner_url: '',
    gallery_images: '[]',
    custom_services: '[]',
    price_multiplier: 1.0,
    min_price_limit: 0,
    has_booth: false,
    level1_staff_count: 0,
    level2_staff_count: 0,
    google_place_id: '',
    ...partial,
  };
}
