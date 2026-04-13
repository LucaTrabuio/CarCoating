import Link from 'next/link';
import type { CasesConfig } from '@/lib/block-types';
import { SAMPLE_CASES } from '@/data/cases-sample';

interface CasesBlockProps {
  config: CasesConfig;
  basePath: string;
}

export default function CasesBlock({ config, basePath }: CasesBlockProps) {
  const cases = SAMPLE_CASES.slice(0, config.max_cases);

  if (cases.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-[#0C3290] text-3xl md:text-5xl font-black tracking-tight text-center mb-8" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {'\u6700\u8FD1\u306E\u65BD\u5DE5\u4E8B\u4F8B'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cases.map((c, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={c.imageUrl} alt={c.car} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-[#0C3290] text-xs font-bold truncate">{c.car}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{c.coatingType}</p>
              </div>
            </div>
          ))}
        </div>
        {config.show_link_to_all && (
          <div className="text-right mt-8">
            <Link
              href={`${basePath}/cases`}
              className="inline-block bg-amber-500 text-[#0C3290] px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
            >
              {'\u65BD\u5DE5\u4E8B\u4F8B\u3092\u3059\u3079\u3066\u898B\u308B \u2192'}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
