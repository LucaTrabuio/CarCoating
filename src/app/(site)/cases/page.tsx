'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SAMPLE_CASES } from '@/data/cases-sample';
import { coatingTiers } from '@/data/coating-tiers';
import { getPriceForSize, getWebPrice, formatPrice } from '@/lib/pricing';
import type { CarSize } from '@/lib/types';

const FILTERS = ['すべて', 'クリスタル', 'フレッシュ', 'ダイヤモンド', 'ダイヤⅡ', 'EX'];
const CAR_TYPES = ['全て', '軽自動車', 'セダン', 'SUV', 'ミニバン', '輸入車'];

export default function CasesPage() {
  const [filter, setFilter] = useState('すべて');
  const [carTypeFilter, setCarTypeFilter] = useState('全て');
  const discountRate = 20;

  const sorted = [...SAMPLE_CASES].sort((a, b) => b.date.localeCompare(a.date));
  const featured = sorted[0];
  const featuredTier = coatingTiers.find(t => t.id === featured.tierId);
  const featuredRegularPrice = featuredTier
    ? formatPrice(getPriceForSize(featuredTier, featured.carSize as CarSize))
    : null;
  const featuredWebPrice = featuredTier
    ? formatPrice(getWebPrice(featuredTier, featured.carSize as CarSize, discountRate))
    : null;

  const filtered = sorted.filter(c => {
    const matchCoating = filter === 'すべて' || c.coatingType.includes(filter);
    const matchCar = carTypeFilter === '全て' || c.carType === carTypeFilter;
    return matchCoating && matchCar;
  });

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
          施工事例
        </h1>
        <p className="text-white/50 text-sm mt-1">施工実績 {SAMPLE_CASES.length}件</p>
      </section>

      {/* FEATURED CASE */}
      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>ピックアップ</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="rounded-xl overflow-hidden bg-gray-100 min-h-[200px] flex items-center justify-center">
              {featured.imageUrl
                ? <img src={featured.imageUrl} alt={featured.car} className="w-full h-full object-cover" />
                : <span className="text-sm text-gray-400">画像準備中</span>
              }
            </div>
            <div>
              <span className="text-xs bg-gradient-to-r from-amber-600 to-amber-400 text-white font-bold px-2 py-0.5 rounded-full">Featured</span>
              <h3 className="text-lg font-bold mt-2 mb-1">{featured.car}</h3>
              <p className="text-xs text-gray-500 mb-3">{featured.coatingType}</p>
              {featured.staffComment && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{featured.staffComment}</p>
              )}
              <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
                {featuredTier && <span>施工時間：{featuredTier.application_time}</span>}
                {featuredRegularPrice && <span>通常価格：{featuredRegularPrice}</span>}
                {featuredWebPrice && <span className="text-amber-600 font-semibold">Web割価格：{featuredWebPrice}</span>}
              </div>
              <Link href={`/booking?plan=${featured.tierId}`}
                className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-lg text-sm">
                同じコースで見積もり →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="py-6 px-5 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-xs text-gray-400 text-center mb-2">車のタイプで絞り込む</p>
          <div className="flex gap-2 justify-center flex-wrap mb-3">
            {CAR_TYPES.map(t => (
              <button key={t} onClick={() => setCarTypeFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  carTypeFilter === t ? 'bg-[#0f1c2e] text-white border-[#0f1c2e]' : 'bg-white text-gray-500 border-gray-300 hover:border-amber-500'}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mb-2">コーティング種類で絞り込む</p>
          <div className="flex gap-2 justify-center flex-wrap mb-4">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filter === f ? 'bg-[#0f1c2e] text-white border-[#0f1c2e]' : 'bg-white text-gray-500 border-gray-300 hover:border-amber-500'}`}>
                {f}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">{filtered.length}件の事例</p>

          {/* GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {filtered.map((c, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="bg-gray-100 h-40 flex items-center justify-center">
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt={c.car} className="w-full h-full object-cover" />
                    : <span className="text-[10px] text-gray-400">画像準備中</span>
                  }
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-[#0f1c2e]">{c.car}</div>
                  <div className="text-xs text-gray-500">{c.coatingType} ｜ {c.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 px-5">
        <div className="max-w-[600px] mx-auto bg-[#0f1c2e] rounded-xl p-8 text-center text-white">
          <h3 className="font-bold text-lg mb-1">あなたの車もこの仕上がりに</h3>
          <p className="text-sm opacity-60 mb-4">まずは無料見積もりから</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/price" className="px-5 py-2.5 bg-white text-[#0f1c2e] font-bold rounded-lg text-sm">見積もり →</Link>
            <a href="#" className="px-5 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINEで相談</a>
          </div>
        </div>
      </section>
    </main>
  );
}
