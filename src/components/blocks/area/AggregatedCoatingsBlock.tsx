import type { AggregatedCoatingRow } from '@/lib/area-blocks';
import Link from 'next/link';

interface Props {
  rows: AggregatedCoatingRow[];
}

export default function AggregatedCoatingsBlock({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-black text-[#0C3290]">コーティングメニュー</h2>
          <p className="text-sm text-gray-500 mt-2">このエリアで対応しているコーティングコース</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rows.map(row => (
            <div key={row.tier.id} className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base text-[#0C3290]">{row.tier.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{row.tier.tagline}</p>
                </div>
                {row.tier.is_popular && (
                  <span className="flex-shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">人気</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">{row.tier.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.storeIds.map((storeId, i) => (
                  <Link
                    key={storeId}
                    href={`/${storeId}`}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {row.storeNames[i]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
