'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const FILTERS = ['すべて', 'クリスタル', 'フレッシュ', 'ダイヤモンド', 'ダイヤⅡ', 'EX'];
const CAR_TYPES = ['全て', '軽自動車', 'セダン', 'SUV', 'ミニバン', '輸入車'];

const SAMPLE_CASES = [
  { car: 'トヨタ ハリアー', type: 'ダイヤモンドキーパー', date: '2026/03', carType: 'SUV' },
  { car: 'テスラ Model Y', type: 'ダイヤⅡキーパー', date: '2026/03', carType: '輸入車' },
  { car: 'ホンダ N-BOX', type: 'クリスタルキーパー', date: '2026/02', carType: '軽自動車' },
  { car: 'BMW 3シリーズ', type: 'EXキーパー', date: '2026/02', carType: '輸入車' },
  { car: 'トヨタ アルファード', type: 'ダイヤⅡキーパー', date: '2026/01', carType: 'ミニバン' },
  { car: 'ポルシェ 911', type: 'EXキーパープレミアム', date: '2026/01', carType: '輸入車' },
  { car: '日産 ノート', type: 'クリスタルキーパー', date: '2025/12', carType: 'セダン' },
  { car: 'レクサス RX', type: 'ダイヤモンドキーパー', date: '2025/12', carType: 'SUV' },
  { car: 'スバル BRZ', type: 'ダイヤモンドプレミアム', date: '2025/11', carType: 'セダン' },
];

export default function CasesPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [filter, setFilter] = useState('すべて');
  const [carTypeFilter, setCarTypeFilter] = useState('全て');

  const filtered = SAMPLE_CASES.filter(c => {
    const matchCoating = filter === 'すべて' || c.type.includes(filter);
    const matchCar = carTypeFilter === '全て' || c.carType === carTypeFilter;
    return matchCoating && matchCar;
  });

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
          施工事例 — ビフォーアフター
        </h1>
        <p className="text-white/50 text-sm mt-1">施工実績 {SAMPLE_CASES.length}件</p>
      </section>

      {/* FEATURED CASE */}
      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>ピックアップ</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="grid grid-cols-2 rounded-xl overflow-hidden relative">
              <div className="bg-[#e8e4db] min-h-[200px] flex items-center justify-center text-sm text-gray-500">BEFORE</div>
              <div className="bg-gray-200 min-h-[200px] flex items-center justify-center text-sm text-gray-500">AFTER</div>
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-amber-500 to-amber-700">
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">⟷</div>
              </div>
            </div>
            <div>
              <span className="text-xs bg-gradient-to-r from-amber-600 to-amber-400 text-white font-bold px-2 py-0.5 rounded-full">Featured</span>
              <h3 className="text-lg font-bold mt-2 mb-1">{SAMPLE_CASES[0].car}</h3>
              <p className="text-xs text-gray-500 mb-3">{SAMPLE_CASES[0].type}</p>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                経年3年で小傷と水垢が目立っていたため、軽研磨で下地を整えてからダイヤモンドキーパーを施工。新車時以上の深い艶が復活しました。
              </p>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>施工時間：8時間</span>
                <span>参考価格：¥67,600</span>
              </div>
              <Link href={`/${storeId}/booking?plan=diamond`}
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
                <div className="grid grid-cols-2 relative">
                  <div className="bg-[#e8e4db] h-24 flex items-center justify-center text-[10px] text-gray-500">BEFORE</div>
                  <div className="bg-gray-200 h-24 flex items-center justify-center text-[10px] text-gray-500">AFTER</div>
                  <span className="absolute top-1 left-1 text-[8px] bg-black/50 text-white px-1 rounded">BEFORE</span>
                  <span className="absolute top-1 right-1 text-[8px] bg-black/50 text-white px-1 rounded">AFTER</span>
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-[#0f1c2e]">{c.car}</div>
                  <div className="text-xs text-gray-500">{c.type} ｜ {c.date}</div>
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
            <Link href={`/${storeId}/price`} className="px-5 py-2.5 bg-white text-[#0f1c2e] font-bold rounded-lg text-sm">見積もり →</Link>
            <a href="#" className="px-5 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINEで相談</a>
          </div>
        </div>
      </section>
    </main>
  );
}
