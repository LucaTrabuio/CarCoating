import type { AggregatedOptionRow } from '@/lib/area-blocks';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  coating: 'コーティング系',
  window: 'ウィンドウ系',
  body: 'ボディ系',
  chemical: 'ケミカル系',
  interior: '車内系',
};

interface Props {
  rows: AggregatedOptionRow[];
}

export default function AggregatedOptionsBlock({ rows }: Props) {
  if (rows.length === 0) return null;

  const byCategory = rows.reduce<Record<string, AggregatedOptionRow[]>>((acc, row) => {
    const cat = row.option.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-black text-[#0C3290]">オプションメニュー</h2>
          <p className="text-sm text-gray-500 mt-2">このエリアで対応しているオプションサービス</p>
        </div>
        {Object.entries(byCategory).map(([cat, catRows]) => (
          <div key={cat} className="mb-8">
            <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catRows.map(row => (
                <div key={row.option.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm text-[#0C3290]">{row.option.name}</h4>
                    {row.option.popular && (
                      <span className="flex-shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">人気</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{row.option.description}</p>
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
        ))}
      </div>
    </section>
  );
}
