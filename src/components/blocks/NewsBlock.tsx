import type { NewsConfig, StoreNewsItem } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import NewsSection from '@/components/NewsSection';

interface NewsBlockProps {
  config: NewsConfig;
  store: V3StoreData;
}

export default function NewsBlock({ config, store }: NewsBlockProps) {
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
          className="text-xl font-bold text-[#0f1c2e] text-center mb-8"
          style={{ fontFamily: '"Noto Serif JP", serif' }}
        >
          お知らせ
        </h2>
        <div className="space-y-3 max-w-[700px] mx-auto">
          {visibleItems.map(item => (
            <div key={item.id} className="border-b border-gray-200 pb-3">
              <div className="text-xs text-gray-400 mb-1">{item.date}</div>
              <div className="font-semibold text-sm text-[#0f1c2e]">{item.title}</div>
              {item.content && (
                <p className="text-xs text-gray-500 mt-1">{item.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
