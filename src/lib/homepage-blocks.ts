export interface HomepageBlock {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  order: number;
  config: Record<string, unknown>;
}

export const DEFAULT_HOMEPAGE_BLOCKS: HomepageBlock[] = [
  {
    id: 'hero',
    type: 'hero_home',
    label: 'ヒーローセクション',
    visible: true,
    order: 0,
    config: {
      title: '洗車だけで、この輝きが続く。',
      subtitle: 'KeePer PRO SHOP',
      description: '特許技術のガラスコーティングで愛車を守る。全国のKeePer認定プロショップで、あなたの車に最適なコースをご提案します。',
      cta_primary_text: '近くの店舗を探す',
      cta_primary_link: '#store-finder',
      cta_secondary_text: 'メニューを見る',
      cta_secondary_link: '#services',
    },
  },
  {
    id: 'services',
    type: 'service_menu',
    label: 'コーティングメニュー',
    visible: true,
    order: 1,
    config: { show_prices: true },
  },
  {
    id: 'why',
    type: 'why_keeper',
    label: 'KeePer が選ばれる理由',
    visible: true,
    order: 2,
    config: {},
  },
  {
    id: 'gallery',
    type: 'store_gallery',
    label: '全国の店舗（ギャラリー）',
    visible: true,
    order: 3,
    config: {},
  },
  {
    id: 'finder',
    type: 'store_finder',
    label: '店舗検索マップ',
    visible: true,
    order: 4,
    config: { heading: '店舗検索' },
  },
  {
    id: 'blog',
    type: 'blog_section',
    label: 'ブログ・コラム',
    visible: true,
    order: 5,
    config: { max_articles: 4, heading: 'コラム・お役立ち情報' },
  },
  {
    id: 'news',
    type: 'news_home',
    label: 'ニュース・お知らせ',
    visible: true,
    order: 6,
    config: { max_items: 5, heading: 'お知らせ' },
  },
  {
    id: 'process',
    type: 'process_home',
    label: '施工の流れ',
    visible: true,
    order: 7,
    config: {},
  },
  {
    id: 'cta',
    type: 'cta_home',
    label: 'CTA（予約誘導）',
    visible: true,
    order: 8,
    config: {
      heading: 'コーティングを始めませんか？',
      description: 'お近くの店舗で無料見積もり。Web予約限定の割引特典もご用意しています。',
      button_text: '近くの店舗を探す',
      button_link: '#store-finder',
    },
  },
];

export const HOMEPAGE_BLOCK_META: Record<string, { labelJa: string; icon: string }> = {
  hero_home: { labelJa: 'ヒーローセクション', icon: '🏠' },
  service_menu: { labelJa: 'コーティングメニュー', icon: '✨' },
  why_keeper: { labelJa: 'KeePer が選ばれる理由', icon: '⭐' },
  store_gallery: { labelJa: '全国の店舗（ギャラリー）', icon: '🖼️' },
  store_finder: { labelJa: '店舗検索マップ', icon: '📍' },
  blog_section: { labelJa: 'ブログ・コラム', icon: '📝' },
  news_home: { labelJa: 'ニュース・お知らせ', icon: '📰' },
  process_home: { labelJa: '施工の流れ', icon: '🔧' },
  cta_home: { labelJa: 'CTA（予約誘導）', icon: '🎯' },
};
