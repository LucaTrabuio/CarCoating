import { news, CATEGORY_LABELS } from '@/data/news';

interface Props {
  maxItems?: number;
  heading?: string;
}

export default function NewsHomeBlock({ maxItems = 5, heading = 'お知らせ' }: Props) {
  const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, maxItems);

  return (
    <section className="py-16 px-5 bg-slate-50">
      <div className="max-w-[800px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{heading}</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {sortedNews.map(item => (
            <div key={item.id} className="px-5 py-4 flex items-start gap-4">
              <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                <span className="text-xs text-gray-400 w-[80px]">{item.date}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_LABELS[item.category]?.color || 'bg-gray-100 text-gray-600'}`}>
                  {CATEGORY_LABELS[item.category]?.label || item.category}
                </span>
              </div>
              <p className="text-sm text-[#0C3290] font-medium flex-1">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
