// ─── Block Type System ───
// Each page section is a "block" with a type, config, visibility, and order.
// The page layout is stored as JSON in the store's page_layout field.

export type BlockType =
  | 'hero'
  | 'store_intro'
  | 'staff_photo'
  | 'before_after'
  | 'gallery'
  | 'usp'
  | 'concerns'
  | 'quiz'
  | 'simulator'
  | 'cases'
  | 'pricing'
  | 'news'
  | 'process'
  | 'benefits'
  | 'access'
  | 'cta'
  | 'certifications'
  | 'appeal_points'
  | 'banners'
  | 'custom_html';

// ─── Per-block config interfaces ───

export interface HeroConfig {
  title: string;
  subtitle: string;
  image_url: string;
  show_badges: boolean;
  show_cta_booking: boolean;
  show_cta_inquiry: boolean;
}

export interface StoreIntroConfig {
  show_exterior: boolean;
  show_interior: boolean;
}

export interface StaffPhotoConfig {
  caption: string;
}

export interface BeforeAfterConfig {
  show_link_to_cases: boolean;
}

export interface GalleryConfig {
  columns_desktop: number;
  columns_mobile: number;
  max_images: number;
}

export interface USPItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface USPConfig {
  items: USPItem[];
}

export interface ConcernItem {
  id: string;
  question: string;
  answer: string;
}

export interface ConcernsConfig {
  items: ConcernItem[];
}

export interface QuizConfig {
  // pass-through to RecommendationQuiz for now
}

export interface SimulatorConfig {
  // pass-through to HomeSimulatorLink for now
}

export interface CasesConfig {
  max_cases: number;
  show_link_to_all: boolean;
}

export interface PricingConfig {
  featured_tier_ids: string[];
  blur_fields: string[]; // per-tier blur: ['crystal-keeper:web_price', 'diamond-keeper:maintenance_price', 'all:web_price'] or legacy ['web_price']
  show_discount_badge: boolean;
  show_size_chart: boolean;
  option_discount_sync: boolean; // true = use store's discount_rate for options too
  option_discount_rate: number;  // custom rate when sync is off (0 = no discount shown)
}

export interface StoreNewsItem {
  id: string;
  title: string;
  content: string;
  date: string; // ISO date string
  visible: boolean;
}

export interface NewsConfig {
  max_items: number;
}

export interface ProcessStep {
  id: string;
  number: number;
  title: string;
  description: string;
}

export interface ProcessConfig {
  steps: ProcessStep[];
}

export interface BenefitItem {
  id: string;
  text: string;
}

export interface BenefitsConfig {
  items: BenefitItem[];
  show_booking_cta: boolean;
  show_inquiry_cta: boolean;
}

export interface AccessConfig {
  show_map: boolean;
  show_nearby_stores: boolean;
}

export interface CTAConfig {
  show_phone: boolean;
  show_line: boolean;
  custom_message: string;
}

export interface Certification {
  id: string;
  title: string;      // H2
  subtitle: string;   // H3
  image_url: string;
}

export interface CertificationsConfig {
  certs: Certification[];
}

export interface AppealPoint {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface AppealPointsConfig {
  selected_ids: string[];
  show_descriptions: boolean;
}

export interface Banner {
  id: string;
  template_id: string;
  custom_css: string;
  title: string;
  subtitle: string;
  image_url: string;
  original_price: number;
  discount_rate: number;
  link_url: string;
  visible: boolean;
}

export interface BannersConfig {
  banners: Banner[];
}

export interface CustomHtmlConfig {
  html: string;
  css: string;
}

// ─── Config type map ───

export interface BlockConfigMap {
  hero: HeroConfig;
  store_intro: StoreIntroConfig;
  staff_photo: StaffPhotoConfig;
  before_after: BeforeAfterConfig;
  gallery: GalleryConfig;
  usp: USPConfig;
  concerns: ConcernsConfig;
  quiz: QuizConfig;
  simulator: SimulatorConfig;
  cases: CasesConfig;
  pricing: PricingConfig;
  news: NewsConfig;
  process: ProcessConfig;
  benefits: BenefitsConfig;
  access: AccessConfig;
  cta: CTAConfig;
  certifications: CertificationsConfig;
  appeal_points: AppealPointsConfig;
  banners: BannersConfig;
  custom_html: CustomHtmlConfig;
}

// ─── Block instance ───

export interface PageBlock<T extends BlockType = BlockType> {
  id: string;
  type: T;
  visible: boolean;
  order: number;
  config: BlockConfigMap[T];
}

// ─── Page layout ───

export interface PageLayout {
  version: 2;
  blocks: PageBlock[];
}

// ─── Blur config ───

export interface BlurConfig {
  [fieldPath: string]: boolean; // e.g. "pricing.web_price": true
}

// ─── Block metadata (labels, icons, defaults) ───

export interface BlockMeta {
  type: BlockType;
  label: string;
  labelJa: string;
  icon: string;
  defaultConfig: BlockConfigMap[BlockType];
  maxInstances?: number; // undefined = unlimited
}

const DEFAULT_USP_ITEMS: USPItem[] = [
  { id: '1', icon: '🛡️', title: '最高品質のコーティング', description: 'KeePer技研が開発した最先端のコーティング技術を使用' },
  { id: '2', icon: '👨‍🔧', title: '技術認定スタッフ', description: '全スタッフがKeePer技術資格を保有' },
  { id: '3', icon: '⏱️', title: '短時間施工', description: '最短2時間からの施工が可能' },
  { id: '4', icon: '💰', title: 'Web限定割引', description: 'ホームページからのご予約で特別割引' },
  { id: '5', icon: '🏢', title: '専用ブース完備', description: 'コーティング専用の施工ブースで丁寧に仕上げ' },
  { id: '6', icon: '📋', title: 'アフターサポート', description: 'メンテナンスプログラムで美しさを長期維持' },
];

const DEFAULT_CONCERN_ITEMS: ConcernItem[] = [
  { id: '1', question: 'コーティングは本当に必要ですか？', answer: '新車の輝きを長期間維持し、洗車の手間を大幅に削減できます。' },
  { id: '2', question: '施工時間はどのくらいですか？', answer: 'コースにより異なりますが、最短2時間から施工可能です。' },
  { id: '3', question: '雨の日でも効果がありますか？', answer: '撥水・疎水コーティングにより、雨天時も水滴が流れ落ちやすくなります。' },
  { id: '4', question: 'メンテナンスは必要ですか？', answer: 'コースに応じた定期メンテナンスで、コーティング効果を最大限持続できます。' },
  { id: '5', question: '他社との違いは何ですか？', answer: 'KeePer技研認定の技術力と、専用ブースでの丁寧な施工が違いです。' },
  { id: '6', question: '予約なしでも大丈夫ですか？', answer: 'ご予約優先となりますが、空き状況により当日対応も可能です。' },
];

const DEFAULT_PROCESS_STEPS: ProcessStep[] = [
  { id: '1', number: 1, title: 'お見積もり・ご相談', description: 'お車の状態を確認し、最適なコースをご提案します。' },
  { id: '2', number: 2, title: 'ご予約・ご来店', description: 'ご都合の良い日時でご予約いただき、お車をお持ちください。' },
  { id: '3', number: 3, title: '施工・お引き渡し', description: '専用ブースで丁寧に施工し、仕上がりをご確認いただきます。' },
];

const DEFAULT_BENEFIT_ITEMS: BenefitItem[] = [
  { id: '1', text: 'Web予約限定の特別割引' },
  { id: '2', text: '技術認定スタッフによる施工' },
  { id: '3', text: '施工後のアフターサポート' },
  { id: '4', text: '代車無料サービス' },
  { id: '5', text: '各種お支払い方法に対応' },
];

export const BLOCK_META: BlockMeta[] = [
  { type: 'hero', label: 'Hero Banner', labelJa: 'ヒーローバナー', icon: '🖼️', maxInstances: 1, defaultConfig: { title: '', subtitle: '', image_url: '', show_badges: true, show_cta_booking: true, show_cta_inquiry: true } },
  { type: 'store_intro', label: 'Store Introduction', labelJa: '店舗紹介', icon: '🏪', maxInstances: 1, defaultConfig: { show_exterior: true, show_interior: true } },
  { type: 'staff_photo', label: 'Staff Photo', labelJa: 'スタッフ写真', icon: '👥', maxInstances: 1, defaultConfig: { caption: '' } },
  { type: 'before_after', label: 'Before / After', labelJa: 'ビフォーアフター', icon: '🔄', maxInstances: 1, defaultConfig: { show_link_to_cases: true } },
  { type: 'gallery', label: 'Photo Gallery', labelJa: 'フォトギャラリー', icon: '📸', maxInstances: 1, defaultConfig: { columns_desktop: 4, columns_mobile: 2, max_images: 8 } },
  { type: 'usp', label: 'Why Choose Us', labelJa: '選ばれる理由', icon: '⭐', maxInstances: 1, defaultConfig: { items: DEFAULT_USP_ITEMS } },
  { type: 'concerns', label: 'FAQ / Concerns', labelJa: 'よくある質問', icon: '❓', maxInstances: 1, defaultConfig: { items: DEFAULT_CONCERN_ITEMS } },
  { type: 'quiz', label: 'Recommendation Quiz', labelJa: 'おすすめ診断', icon: '🧪', maxInstances: 1, defaultConfig: {} },
  { type: 'simulator', label: 'Price Simulator', labelJa: 'かんたん見積もり', icon: '🧮', maxInstances: 1, defaultConfig: {} },
  { type: 'cases', label: 'Case Studies', labelJa: '施工事例', icon: '📋', maxInstances: 1, defaultConfig: { max_cases: 4, show_link_to_all: true } },
  { type: 'pricing', label: 'Pricing Menu', labelJa: '料金メニュー', icon: '💰', maxInstances: 1, defaultConfig: { featured_tier_ids: ['crystal', 'diamond', 'dia2'], blur_fields: [], show_discount_badge: true, show_size_chart: true, option_discount_sync: true, option_discount_rate: 10 } },
  { type: 'news', label: 'Store News', labelJa: 'お知らせ', icon: '📰', maxInstances: 1, defaultConfig: { max_items: 5 } },
  { type: 'process', label: 'Process Flow', labelJa: 'ご利用の流れ', icon: '📝', maxInstances: 1, defaultConfig: { steps: DEFAULT_PROCESS_STEPS } },
  { type: 'benefits', label: 'Benefits CTA', labelJa: '5つの特典', icon: '🎁', maxInstances: 1, defaultConfig: { items: DEFAULT_BENEFIT_ITEMS, show_booking_cta: true, show_inquiry_cta: true } },
  { type: 'access', label: 'Store Access', labelJa: 'アクセス', icon: '📍', maxInstances: 1, defaultConfig: { show_map: true, show_nearby_stores: false } },
  { type: 'cta', label: 'Final CTA', labelJa: 'お問い合わせ', icon: '📞', maxInstances: 1, defaultConfig: { show_phone: true, show_line: true, custom_message: '' } },
  { type: 'certifications', label: 'Certifications', labelJa: '認定・資格', icon: '🏆', defaultConfig: { certs: [] } },
  { type: 'appeal_points', label: 'Appeal Points', labelJa: 'アピールポイント', icon: '💪', maxInstances: 1, defaultConfig: { selected_ids: [], show_descriptions: true } },
  { type: 'banners', label: 'Promotional Banners', labelJa: 'プロモーションバナー', icon: '🎨', defaultConfig: { banners: [] } },
  { type: 'custom_html', label: 'Custom Content', labelJa: 'カスタムコンテンツ', icon: '✏️', defaultConfig: { html: '', css: '' } },
];

// ─── Default block order (matches current V3 store page section order) ───

const DEFAULT_BLOCK_ORDER: BlockType[] = [
  'hero',
  'store_intro',
  'staff_photo',
  'before_after',
  'gallery',
  'usp',
  'concerns',
  'quiz',
  'simulator',
  'cases',
  'pricing',
  'news',
  'process',
  'benefits',
  'access',
  'cta',
];

let _blockIdCounter = 0;
function generateBlockId(): string {
  _blockIdCounter++;
  return `block_${Date.now()}_${_blockIdCounter}`;
}

/** Reset counter (for testing) */
export function _resetBlockIdCounter(): void {
  _blockIdCounter = 0;
}

/**
 * Generate a default page layout from a store's existing data.
 * This is the migration bridge: existing stores with no page_layout
 * get the current hardcoded section order with config pulled from their fields.
 */
export function generateDefaultLayout(store?: {
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  has_booth?: boolean;
  level1_staff_count?: number;
  level2_staff_count?: number;
}): PageLayout {
  const blocks: PageBlock[] = DEFAULT_BLOCK_ORDER.map((type, index) => {
    const meta = BLOCK_META.find(m => m.type === type)!;
    const block: PageBlock = {
      id: generateBlockId(),
      type,
      visible: true,
      order: index,
      config: structuredClone(meta.defaultConfig),
    };

    // Pull config from existing store data where applicable
    if (type === 'hero' && store) {
      const config = block.config as HeroConfig;
      if (store.hero_title) config.title = store.hero_title;
      if (store.hero_subtitle) config.subtitle = store.hero_subtitle;
      if (store.hero_image_url) config.image_url = store.hero_image_url;
      config.show_badges = store.has_booth !== undefined ? store.has_booth : true;
    }

    return block;
  });

  return { version: 2, blocks };
}

/**
 * Parse a page_layout JSON string from Firestore.
 * Returns the parsed layout, or generates a default if the string is empty/invalid.
 */
// Fix stale tier IDs from old default config
const TIER_ID_FIXES: Record<string, string> = {
  'crystal-keeper': 'crystal',
  'diamond-keeper': 'diamond',
  'diamond-keeper-double': 'dia2',
};

function migrateLayout(layout: PageLayout): PageLayout {
  return {
    ...layout,
    blocks: layout.blocks.map(block => {
      if (block.type === 'pricing') {
        const config = block.config as PricingConfig;
        const fixedTierIds = config.featured_tier_ids.map(id => TIER_ID_FIXES[id] || id);
        const fixedBlurFields = config.blur_fields.map(f => {
          const [tierId, field] = f.split(':');
          if (field && TIER_ID_FIXES[tierId]) return `${TIER_ID_FIXES[tierId]}:${field}`;
          return f;
        });
        return { ...block, config: { ...config, featured_tier_ids: fixedTierIds, blur_fields: fixedBlurFields } };
      }
      return block;
    }),
  };
}

export function parsePageLayout(json?: string, store?: Parameters<typeof generateDefaultLayout>[0]): PageLayout {
  if (!json) return generateDefaultLayout(store);

  try {
    const parsed = JSON.parse(json);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.blocks)) {
      return migrateLayout(parsed as PageLayout);
    }
    return generateDefaultLayout(store);
  } catch {
    return generateDefaultLayout(store);
  }
}

/**
 * Serialize a page layout to JSON for Firestore storage.
 */
export function serializePageLayout(layout: PageLayout): string {
  return JSON.stringify(layout);
}

/**
 * Get the BlockMeta for a given block type.
 */
export function getBlockMeta(type: BlockType): BlockMeta | undefined {
  return BLOCK_META.find(m => m.type === type);
}

/**
 * Create a new block instance of the given type with default config.
 */
export function createBlock(type: BlockType, order: number): PageBlock {
  const meta = BLOCK_META.find(m => m.type === type);
  if (!meta) throw new Error(`Unknown block type: ${type}`);
  return {
    id: generateBlockId(),
    type,
    visible: true,
    order,
    config: structuredClone(meta.defaultConfig),
  };
}
