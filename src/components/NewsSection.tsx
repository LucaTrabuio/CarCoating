import { news, CATEGORY_LABELS } from '@/data/news';
import Link from 'next/link';

export default function NewsSection() {
  const items = news.slice(0, 5);

  return (
    <section className="py-12 px-5 bg-white">
      <div className="max-w-[700px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
            お知らせ
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map(item => {
            const cat = CATEGORY_LABELS[item.category];
            const content = (
              <div className="flex items-start gap-3 py-3">
                <span className="text-[11px] text-slate-400 font-mono flex-shrink-0 mt-0.5">{item.date}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${cat.color}`}>{cat.label}</span>
                <span className="text-[13px] text-slate-700">{item.title}</span>
              </div>
            );
            return item.link ? (
              <Link key={item.id} href={item.link} className="block hover:bg-slate-50 transition-colors -mx-2 px-2 rounded">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
