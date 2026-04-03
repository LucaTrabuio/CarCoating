export interface NewsItem {
  id: string;
  date: string;
  category: 'campaign' | 'case_study' | 'store_update';
  title: string;
  body?: string;
  link?: string;
}

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  campaign: { label: 'キャンペーン', color: 'bg-amber-100 text-amber-700' },
  case_study: { label: '施工事例', color: 'bg-blue-100 text-blue-700' },
  store_update: { label: 'お知らせ', color: 'bg-slate-100 text-slate-600' },
};

export const news: NewsItem[] = [
  {
    id: 'news-1',
    date: '2026-04-01',
    category: 'campaign',
    title: '春の新生活キャンペーン開始 — 全コーティング最大20%OFF',
    link: '/booking',
  },
  {
    id: 'news-2',
    date: '2026-04-01',
    category: 'case_study',
    title: 'テスラ モデル3 ダイヤⅡキーパー施工事例を追加',
    link: '/cases',
  },
  {
    id: 'news-3',
    date: '2026-03-25',
    category: 'store_update',
    title: 'GW期間中も通常営業いたします',
  },
  {
    id: 'news-4',
    date: '2026-03-18',
    category: 'case_study',
    title: 'トヨタ86 EXキーパー施工 — 息をのむ過剰な美しさ',
    link: '/cases',
  },
  {
    id: 'news-5',
    date: '2026-03-10',
    category: 'store_update',
    title: 'コーティングガイド記事を5本公開しました',
    link: '/blog',
  },
];
