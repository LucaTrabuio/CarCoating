import Link from 'next/link';
import type { NewsConfig, StoreNewsItem } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import NewsSection from '@/components/NewsSection';

interface NewsBlockProps {
  config: NewsConfig;
  store: V3StoreData;
  basePath?: string;
}

export default function NewsBlock({ config, store, basePath }: NewsBlockProps) {
  let newsItems: StoreNewsItem[] = [];
  try {
    newsItems = JSON.parse(store.store_news || '[]');
  } catch { /* empty */ }

  const visibleItems = newsItems
    .filter(item => item.visible)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, config.max_items);

  if (visibleItems.length === 0) {
    return <NewsSection />;
  }

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <h2
          className="text-xl font-bold text-[#0C3290] text-center mb-8"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          お知らせ
        </h2>
        <div className="space-y-3 max-w-[700px] mx-auto">
          {visibleItems.map(item => (
            <div key={item.id} className="border-b border-gray-200 pb-3">
              <div className="text-xs text-gray-400 mb-1">{item.date}</div>
              <div className="font-semibold text-sm text-[#0C3290]">{item.title}</div>
              {item.content && (
                <p className="text-xs text-gray-500 mt-1">{item.content}</p>
              )}
            </div>
          ))}
        </div>
        {basePath && (
          <div className="text-center mt-6">
            <Link href={`${basePath}/news`} className="inline-block px-6 py-2.5 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors">
              すべてのお知らせを見る →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
