'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CarSimulator from '@/components/CarSimulator';
import PricingTable from '@/components/PricingTable';
import ComparisonMatrix from '@/components/ComparisonMatrix';
import OptionCalculator from '@/components/OptionCalculator';
import { CarSize } from '@/lib/types';
import { coatingTiers } from '@/data/coating-tiers';
import { getWebPrice, formatPrice, sizeLabels, getTotalCostOverYears } from '@/lib/pricing';
import { getBlurFieldsFromLayout, isBlurred } from '@/lib/blur-utils';
import Link from 'next/link';
import { trackEvent } from '@/lib/track';
import { parsePageLayout } from '@/lib/block-types';
import type { PricingConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';

const ALL_SIZES: CarSize[] = ['SS', 'S', 'M', 'L', 'LL', 'XL'];

function PriceContentInner({ store }: { store: V3StoreData }) {
  const searchParams = useSearchParams();
  const storeId = store.store_id;
  const base = `/${storeId}`;

  // Derive from store prop instead of useEffect fetch
  const discountRate = store.discount_rate || 20;
  const blurFields = store.page_layout ? getBlurFieldsFromLayout(store.page_layout) : [];

  const layout = store.page_layout ? parsePageLayout(store.page_layout, store) : null;
  const pricingBlock = layout?.blocks.find(b => b.type === 'pricing');
  const pc = pricingBlock?.config as PricingConfig | undefined;
  const optionDiscountSync = pc?.option_discount_sync ?? true;
  const optionDiscountRate = optionDiscountSync ? discountRate : (pc?.option_discount_rate ?? 10);

  const [selectedSize, setSelectedSize] = useState<CarSize | null>(null);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [sizeMode, setSizeMode] = useState<'car' | 'size'>('car');

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
    setSelectedSize(size); setSelectedMake(make); setSelectedModel(model); setSelectedPlan(null);
  }

  function handleDirectSizeSelect(size: CarSize) {
    setSelectedSize(size); setSelectedMake(''); setSelectedModel(''); setSelectedPlan(null);
  }

  const sizeHeading = selectedMake && selectedModel
    ? `${selectedMake} ${selectedModel}（${selectedSize}サイズ）の料金`
    : `${selectedSize}サイズの料金`;

  return (
    <main>
      <section className="bg-[#0f1c2e] pt-8 pb-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-white text-xl md:text-2xl font-bold" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>見積もりシミュレーター</h1>
            <p className="text-white/50 text-sm mt-1">車種を選ぶか、サイズで直接料金を確認できます。</p>
          </div>
          <div className="flex justify-center gap-2 mb-6">
            <button onClick={() => setSizeMode('car')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${sizeMode === 'car' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>車種から探す</button>
            <button onClick={() => setSizeMode('size')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${sizeMode === 'size' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>サイズから探す</button>
          </div>
          {sizeMode === 'car' ? (
            <CarSimulator onSizeChange={handleSizeChange} />
          ) : (
            <div className="max-w-[700px] mx-auto">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {ALL_SIZES.map(size => (
                  <button key={size} onClick={() => handleDirectSizeSelect(size)}
                    className={`py-3 px-2 rounded-lg text-center transition-all cursor-pointer ${selectedSize === size && sizeMode === 'size' ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-white/10 text-white hover:bg-white/20'}`}>
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

      {selectedSize && (
        <>
          <section className="py-12 px-5">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>{sizeHeading}</h2>
                <p className="text-sm text-gray-500 mt-1">Web予約限定割引 ｜ 税込価格</p>
              </div>
              <PricingTable size={selectedSize} discountRate={discountRate} storeId={storeId} blurFields={blurFields} />
            </div>
          </section>

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
                    <button key={tier.id} onClick={() => { setSelectedPlan(tier.id); trackEvent(storeId, 'plan_select', { plan: tier.id }); }}
                      className={`bg-white rounded-xl p-6 text-center border-2 transition-all cursor-pointer hover:shadow-lg ${selectedPlan === tier.id ? 'border-amber-500 shadow-lg ring-2 ring-amber-200' : isCenter ? 'border-amber-500 relative' : 'border-gray-200'}`}>
                      {isCenter && !selectedPlan && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs font-bold px-3 py-0.5 rounded-full">★ 一番人気</span>}
                      <div className="text-xs text-gray-400 mb-1">{label}</div>
                      <h3 className="font-bold text-lg text-[#0f1c2e] mb-1">{tier.name}</h3>
                      <p className="text-xs text-gray-500 mb-3">{tier.durability_years}持続 ｜ {tier.application_time}</p>
                      {isBlurred(tier.id, 'web_price', blurFields) ? (
                        <div className="relative inline-block">
                          <div style={{ filter: 'blur(8px)' }} className="select-none pointer-events-none text-2xl font-bold text-[#0f1c2e]" aria-hidden="true">{formatPrice(web)}</div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-slate-500 font-semibold bg-white/80 px-2 py-0.5 rounded">要問合せ</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(web)}</div>
                      )}
                      <p className="text-xs text-gray-400 mb-2">{selectedSize}サイズ・Web割後</p>
                      {selectedPlan === tier.id && <div className="text-xs text-amber-500 font-bold mt-2">✓ 選択中</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="py-12 px-5">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>プラン比較マトリクス</h2>
                <p className="text-sm text-gray-500 mt-1">横スクロールで全プランを比較 ｜ {selectedSize}サイズの場合</p>
              </div>
              <ComparisonMatrix size={selectedSize} discountRate={discountRate} blurFields={blurFields} />
            </div>
          </section>

          <section className="py-12 px-5 bg-gray-50">
            <div className="max-w-[800px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>5年間の総コスト比較</h2>
                <p className="text-sm text-gray-500 mt-1">長く乗るほど上位プランがお得</p>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm border-collapse">
                  <thead><tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold">コース</th>
                    <th className="px-3 py-3 text-xs font-semibold">初回施工</th>
                    <th className="px-3 py-3 text-xs font-semibold">年間メンテ</th>
                    <th className="px-3 py-3 text-xs font-semibold">3年総額</th>
                    <th className="px-3 py-3 text-xs font-semibold">5年総額</th>
                  </tr></thead>
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
                          {isBlurred(id, 'web_price', blurFields) ? (
                            <>
                              {[web, maint ? `${formatPrice(maint)}/年` : '毎年再施工', total3, total5].map((val, ci) => (
                                <td key={ci} className={`px-3 py-3 text-center ${ci === 0 || ci >= 2 ? 'font-bold' : 'text-xs text-gray-500'} ${isDiamond && ci >= 2 ? 'text-amber-700' : ''}`}>
                                  <div className="relative inline-block">
                                    <span style={{ filter: 'blur(6px)' }} className="select-none pointer-events-none" aria-hidden="true">{typeof val === 'number' ? formatPrice(val) : val}</span>
                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] text-slate-400 font-semibold">—</span>
                                  </div>
                                </td>
                              ))}
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-center">{formatPrice(web)}</td>
                              <td className="px-3 py-3 text-center text-xs text-gray-500">{maint ? `${formatPrice(maint)}/年` : '毎年再施工'}</td>
                              <td className={`px-3 py-3 text-center font-bold ${isDiamond ? 'text-amber-700' : ''}`}>{formatPrice(total3)}</td>
                              <td className={`px-3 py-3 text-center font-bold ${isDiamond ? 'text-amber-700' : ''}`}>{formatPrice(total5)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {selectedTier && (
            <section className="py-12 px-5">
              <div className="max-w-[700px] mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>オプション追加</h2>
                  <p className="text-sm text-gray-500 mt-1">チェックすると合計額がリアルタイムで更新されます</p>
                </div>
                <OptionCalculator basePlanPrice={getWebPrice(selectedTier, selectedSize, discountRate)} basePlanName={`${selectedTier.name}（${selectedSize}サイズ）`} optionDiscountRate={optionDiscountRate} showDiscountBanner={!optionDiscountSync && optionDiscountRate > 0} />
                <div className="mt-6 text-center">
                  <Link href={`${base}/booking?plan=${selectedTier.id}&size=${selectedSize}&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}`}
                    onClick={() => trackEvent(storeId, 'cta_booking', { source: 'price', plan: selectedTier.id })}
                    className="inline-block w-full max-w-md px-8 py-4 bg-gradient-to-br from-amber-500 via-amber-500 to-amber-700 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity">
                    この内容で空き状況を確認する（仮予約）→
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section className="py-8 px-5 bg-gray-50">
            <div className="max-w-[600px] mx-auto bg-[#0f1c2e] rounded-xl p-8 text-center text-white">
              <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>コース選びに迷ったら</h3>
              <p className="text-sm opacity-60 mb-4">お車の状態を見て最適なコースをご提案します</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href="#" onClick={() => trackEvent(storeId, 'line_click')} className="px-5 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINEで相談</a>
                <a href="#" onClick={() => trackEvent(storeId, 'cta_inquiry', { source: 'price' })} className="px-5 py-2.5 bg-white/10 border border-white/20 text-white font-bold rounded-lg text-sm">&#9742; 電話で相談</a>
              </div>
            </div>
          </section>
        </>
      )}

      {!selectedSize && (
        <section className="py-20 px-5 text-center">
          <div className="text-6xl mb-4">&#128663;</div>
          <h2 className="text-xl font-bold text-gray-300 mb-2">上の車種セレクターで車を選んでください</h2>
          <p className="text-sm text-gray-400">メーカーと車種を選択するか、サイズを直接選ぶと料金が表示されます。</p>
        </section>
      )}
    </main>
  );
}

export default function PriceContent({ store }: { store: V3StoreData }) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">読み込み中...</div>}>
      <PriceContentInner store={store} />
    </Suspense>
  );
}
