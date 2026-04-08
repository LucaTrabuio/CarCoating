'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import CarSimulator from '@/components/CarSimulator';
import PricingTable from '@/components/PricingTable';
import ComparisonMatrix from '@/components/ComparisonMatrix';
import OptionCalculator from '@/components/OptionCalculator';
import { CarSize } from '@/lib/types';
import { coatingTiers } from '@/data/coating-tiers';
import { getWebPrice, formatPrice, sizeLabels, getTotalCostOverYears } from '@/lib/pricing';
import Link from 'next/link';

const ALL_SIZES: CarSize[] = ['SS', 'S', 'M', 'L', 'LL', 'XL'];

export default function StorePricePage() {
  return (
    <Suspense>
      <StorePricePageContent />
    </Suspense>
  );
}

function StorePricePageContent() {
  const { storeId } = useParams<{ storeId: string }>();
  const searchParams = useSearchParams();

  const [discountRate, setDiscountRate] = useState(20);
  const [selectedSize, setSelectedSize] = useState<CarSize | null>(null);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [sizeMode, setSizeMode] = useState<'car' | 'size'>('car');

  // Fetch store discount rate on mount
  useEffect(() => {
    async function fetchDiscount() {
      try {
        const res = await fetch('/api/stores');
        if (res.ok) {
          const stores = await res.json();
          const store = stores.find((s: { store_id: string }) => s.store_id === storeId);
          if (store?.discount_rate) {
            setDiscountRate(store.discount_rate);
          }
        }
      } catch {
        // keep default 20
      }
    }
    fetchDiscount();
  }, [storeId]);

  // Read URL params from homepage on mount
  useEffect(() => {
    const size = searchParams.get('size') as CarSize | null;
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    if (size && ALL_SIZES.includes(size)) {
      setSelectedSize(size);
      if (make) setSelectedMake(make);
      if (model) setSelectedModel(model);
    }
  }, [searchParams]);

  const selectedTier = selectedPlan ? coatingTiers.find(t => t.id === selectedPlan) : null;

  function handleSizeChange(size: CarSize, make: string, model: string) {
    setSelectedSize(size);
    setSelectedMake(make);
    setSelectedModel(model);
    setSelectedPlan(null);
  }

  function handleDirectSizeSelect(size: CarSize) {
    setSelectedSize(size);
    setSelectedMake('');
    setSelectedModel('');
    setSelectedPlan(null);
  }

  const sizeHeading = selectedMake && selectedModel
    ? `${selectedMake} ${selectedModel}（${selectedSize}サイズ）の料金`
    : `${selectedSize}サイズの料金`;

  return (
    <main>
      {/* SIMULATOR */}
      <section className="bg-[#0f1c2e] pt-8 pb-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-white text-xl md:text-2xl font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
              見積もりシミュレーター
            </h1>
            <p className="text-white/50 text-sm mt-1">車種を選ぶか、サイズで直接料金を確認できます。</p>
          </div>

          {/* Mode toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setSizeMode('car')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                sizeMode === 'car'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              車種から探す
            </button>
            <button
              onClick={() => setSizeMode('size')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                sizeMode === 'size'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              サイズから探す
            </button>
          </div>

          {sizeMode === 'car' ? (
            <CarSimulator onSizeChange={handleSizeChange} />
          ) : (
            <div className="max-w-[700px] mx-auto">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {ALL_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => handleDirectSizeSelect(size)}
                    className={`py-3 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      selectedSize === size && sizeMode === 'size'
                        ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="text-lg font-bold">{size}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{sizeLabels[size].replace(`${size}サイズ`, '').replace('（', '').replace('）', '')}</div>
                  </button>
                ))}
              </div>
              {selectedSize && sizeMode === 'size' && (
                <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-500 rounded-lg text-center">
                  <span className="text-2xl font-bold text-amber-700">{selectedSize}サイズ</span>
                  <p className="text-xs text-gray-500 mt-1">{sizeLabels[selectedSize]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* PRICING TABLE (shows after car selection) */}
      {selectedSize && (
        <>
          <section className="py-12 px-5">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
                  {sizeHeading}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Web予約限定割引 ｜ 税込価格</p>
              </div>
              <PricingTable size={selectedSize} discountRate={discountRate} storeId={storeId} />
            </div>
          </section>

          {/* 3-TIER RECOMMENDATION */}
          <section className="py-12 px-5 bg-gray-50">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>おすすめコース</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { tier: coatingTiers.find(t => t.id === 'crystal')!, label: 'スタンダード' },
                  { tier: coatingTiers.find(t => t.id === 'diamond')!, label: 'ベストバリュー' },
                  { tier: coatingTiers.find(t => t.id === 'ex')!, label: 'プレミアム' },
                ].map(({ tier, label }, i) => {
                  const web = getWebPrice(tier, selectedSize, discountRate);
                  const isCenter = i === 1;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedPlan(tier.id)}
                      className={`bg-white rounded-xl p-6 text-center border-2 transition-all cursor-pointer hover:shadow-lg ${
                        selectedPlan === tier.id ? 'border-amber-500 shadow-lg ring-2 ring-amber-200' :
                        isCenter ? 'border-amber-500 relative' : 'border-gray-200'
                      }`}
                    >
                      {isCenter && !selectedPlan && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-400 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                          ★ 一番人気
                        </span>
                      )}
                      <div className="text-xs text-gray-400 mb-1">{label}</div>
                      <h3 className="font-bold text-lg text-[#0f1c2e] mb-1">{tier.name}</h3>
                      <p className="text-xs text-gray-500 mb-3">{tier.durability_years}持続 ｜ {tier.application_time}</p>
                      <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(web)}</div>
                      <p className="text-xs text-gray-400 mb-2">{selectedSize}サイズ・Web割後</p>
                      {selectedPlan === tier.id && (
                        <div className="text-xs text-amber-600 font-bold mt-2">✓ 選択中</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* COMPARISON MATRIX */}
          <section className="py-12 px-5">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
                  プラン比較マトリクス
                </h2>
                <p className="text-sm text-gray-500 mt-1">横スクロールで全プランを比較 ｜ {selectedSize}サイズの場合</p>
              </div>
              <ComparisonMatrix size={selectedSize} discountRate={discountRate} />
            </div>
          </section>

          {/* 5-YEAR COST COMPARISON */}
          <section className="py-12 px-5 bg-gray-50">
            <div className="max-w-[800px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>5年間の総コスト比較</h2>
                <p className="text-sm text-gray-500 mt-1">長く乗るほど上位プランがお得</p>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold">コース</th>
                      <th className="px-3 py-3 text-xs font-semibold">初回施工</th>
                      <th className="px-3 py-3 text-xs font-semibold">年間メンテ</th>
                      <th className="px-3 py-3 text-xs font-semibold">3年総額</th>
                      <th className="px-3 py-3 text-xs font-semibold">5年総額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['crystal', 'diamond', 'ex'].map(id => {
                      const tier = coatingTiers.find(t => t.id === id)!;
                      const web = getWebPrice(tier, selectedSize, discountRate);
                      const total3 = getTotalCostOverYears(tier, selectedSize, 3, discountRate);
                      const total5 = getTotalCostOverYears(tier, selectedSize, 5, discountRate);
                      const maint = tier.maintenance_prices ? tier.maintenance_prices[selectedSize] : null;
                      const isDiamond = id === 'diamond';
                      return (
                        <tr key={id} className={`border-b border-gray-100 ${isDiamond ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3 font-bold text-[#0f1c2e]">{isDiamond && '★ '}{tier.name}</td>
                          <td className="px-3 py-3 text-center">{formatPrice(web)}</td>
                          <td className="px-3 py-3 text-center text-xs text-gray-500">{maint ? `${formatPrice(maint)}/年` : '毎年再施工'}</td>
                          <td className={`px-3 py-3 text-center font-bold ${isDiamond ? 'text-amber-700' : ''}`}>{formatPrice(total3)}</td>
                          <td className={`px-3 py-3 text-center font-bold ${isDiamond ? 'text-amber-700' : ''}`}>{formatPrice(total5)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* OPTIONS CALCULATOR (shows after plan selection) */}
          {selectedTier && (
            <section className="py-12 px-5">
              <div className="max-w-[700px] mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
                    オプション追加
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">チェックすると合計額がリアルタイムで更新されます</p>
                </div>
                <OptionCalculator
                  basePlanPrice={getWebPrice(selectedTier, selectedSize, discountRate)}
                  basePlanName={`${selectedTier.name}（${selectedSize}サイズ）`}
                />
                <div className="mt-6 text-center">
                  <Link
                    href={`/${storeId}/booking?plan=${selectedTier.id}&size=${selectedSize}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}`}
                    className="inline-block w-full max-w-md px-8 py-4 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity"
                  >
                    この内容で空き状況を確認する（仮予約）→
                  </Link>
                  <p className="text-xs text-gray-400 mt-2">※ 車種・プラン・オプションが予約フォームに自動引き継ぎされます</p>
                </div>
              </div>
            </section>
          )}

          {/* MID-PAGE CTA */}
          <section className="py-8 px-5 bg-gray-50">
            <div className="max-w-[600px] mx-auto bg-[#0f1c2e] rounded-xl p-8 text-center text-white">
              <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>コース選びに迷ったら</h3>
              <p className="text-sm opacity-60 mb-4">お車の状態を見て最適なコースをご提案します</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href="#" className="px-5 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINEで相談</a>
                <a href="#" className="px-5 py-2.5 bg-white/10 border border-white/20 text-white font-bold rounded-lg text-sm">&#9742; 電話で相談</a>
              </div>
            </div>
          </section>
        </>
      )}

      {/* PROMPT TO SELECT CAR (when no car selected) */}
      {!selectedSize && (
        <section className="py-20 px-5 text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-xl font-bold text-gray-300 mb-2">上の車種セレクターで車を選んでください</h2>
          <p className="text-sm text-gray-400">メーカーと車種を選択するか、サイズを直接選ぶと料金が表示されます。</p>
        </section>
      )}
    </main>
  );
}
