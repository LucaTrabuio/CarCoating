'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SAMPLE_CASES } from '@/data/cases-sample';
import Link from 'next/link';

export default function V3CasesPage() {
  const { slug: storeId } = useParams<{ slug: string }>();
  const base = `/${storeId}`;
  const [filterCoating, setFilterCoating] = useState('all');
  const [filterCar, setFilterCar] = useState('all');

  const coatingTypes = [...new Set(SAMPLE_CASES.map(c => c.coatingType))];
  const carTypes = [...new Set(SAMPLE_CASES.map(c => c.car.split(' ')[0]))];

  const filtered = SAMPLE_CASES.filter(c => {
    if (filterCoating !== 'all' && c.coatingType !== filterCoating) return false;
    if (filterCar !== 'all' && !c.car.startsWith(filterCar)) return false;
    return true;
  });

  const featured = filtered[0];

  return (
    <main>
      <section className="bg-[#0C3290] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>施工事例</h1>
        <p className="text-white/40 text-sm mt-1">ビフォーアフターで見るKeePer品質</p>
      </section>

      <section className="py-6 px-5 border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto flex flex-wrap gap-2">
          <button onClick={() => setFilterCoating('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${filterCoating === 'all' ? 'bg-amber-500 text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            全コース
          </button>
          {coatingTypes.map(t => (
            <button key={t} onClick={() => setFilterCoating(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${filterCoating === t ? 'bg-amber-500 text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t}
            </button>
          ))}
          <span className="mx-2 border-l border-gray-300" />
          <button onClick={() => setFilterCar('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${filterCar === 'all' ? 'bg-[#0C3290] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            全車種
          </button>
          {carTypes.slice(0, 6).map(t => (
            <button key={t} onClick={() => setFilterCar(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${filterCar === t ? 'bg-[#0C3290] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </section>

      {featured && (
        <section className="py-8 px-5 bg-amber-50">
          <div className="max-w-[900px] mx-auto grid md:grid-cols-2 gap-6">
            <div className="bg-gray-100 rounded-xl h-[250px] flex items-center justify-center overflow-hidden">
              {featured.imageUrl
                ? <img src={featured.imageUrl} alt={featured.car} className="w-full h-full object-cover" />
                : <span className="text-gray-400 text-sm">画像準備中</span>
              }
            </div>
            <div>
              <div className="text-xs text-amber-500 font-bold mb-1">PICKUP</div>
              <h2 className="text-lg font-bold text-[#0C3290] mb-2">{featured.car}</h2>
              <p className="text-sm text-gray-500 mb-3">{featured.coatingType} ｜ {featured.date}</p>
              {featured.staffComment && <p className="text-xs text-gray-500 mt-2 italic">&ldquo;{featured.staffComment}&rdquo;</p>}
            </div>
          </div>
        </section>
      )}

      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-gray-200 bg-white">
              <div className="bg-gray-100 h-[140px] flex items-center justify-center overflow-hidden">
                {c.imageUrl
                  ? <img src={c.imageUrl} alt={c.car} className="w-full h-full object-cover" />
                  : <span className="text-xs text-gray-400">画像準備中</span>
                }
              </div>
              <div className="p-3">
                <div className="text-sm font-bold text-[#0C3290]">{c.car}</div>
                <div className="text-xs text-gray-500">{c.coatingType} ｜ {c.date}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10 px-5 bg-[#0C3290]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティングをご検討中の方へ</h2>
          <div className="flex gap-3 justify-center">
            <Link href={`${base}/booking`} className="px-6 py-2.5 bg-amber-500 text-black font-bold rounded-md text-sm hover:bg-amber-500">予約する →</Link>
            <Link href={`${base}/booking?mode=inquiry`} className="px-6 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20">お問い合わせ</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
