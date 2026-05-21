import Link from 'next/link';
import { storeHref } from '@/lib/store-url';

export interface AreaNewsItem {
  id: string;
  title: string;
  date: string;
  storeId: string;
  storeSlug?: string;
  storeName: string;
  areaSlug: string;
}

interface Props {
  items: AreaNewsItem[];
  maxItems?: number;
}

export default function AreaNewsBlock({ items, maxItems = 5 }: Props) {
  const visible = items.slice(0, maxItems);

  if (visible.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-black text-[#0C3290]">お知らせ</h2>
          <p className="text-sm text-gray-500 mt-2">エリア内の店舗からのお知らせ</p>
        </div>
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {visible.map(item => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <time className="text-xs text-gray-400 flex-shrink-0 w-20">{item.date}</time>
              <Link
                href={storeHref({ store_id: item.storeId, store_slug: item.storeSlug, sub_company_id: item.areaSlug ? 'set' : undefined }, item.areaSlug)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 flex-shrink-0"
              >
                {item.storeName}
              </Link>
              <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
