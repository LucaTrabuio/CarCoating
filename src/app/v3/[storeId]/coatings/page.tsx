/*
 * V3 Coatings page — store-specific, fully visible pricing (no blur)
 * Adapted from V1 [storeId]/coatings/page.tsx with V3 Firebase data
 */

import { notFound } from 'next/navigation';
import { coatingTiers } from '@/data/coating-tiers';
import { formatPrice } from '@/lib/pricing';
import Link from 'next/link';
import { getV3StoreById } from '@/lib/firebase-stores';
import type { Metadata } from 'next';

const KEEPER_BASE = 'https://www.keepercoating.jp';

export async function generateMetadata({ params }: { params: Promise<{ storeId: string }> }): Promise<Metadata> {
  const { storeId } = await params;
  const store = await getV3StoreById(storeId);
  const storeName = store?.store_name ?? 'KeePer PRO SHOP';
  return {
    title: `コーティングメニュー一覧｜${storeName}`,
    description: `${storeName}のカーコーティング全8メニューを詳しく解説。各コースの特徴・構造・耐久年数・価格を比較できます。`,
  };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="tracking-wider">
      <span className="text-amber-500">{'★'.repeat(rating)}</span>
      <span className="text-slate-200">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default async function V3CoatingsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store || !(store.is_active === true || (store.is_active as unknown) === 'TRUE')) notFound();

  const base = `/v3/${storeId}`;

  return (
    <main>
      <section className="bg-[#0f1c2e] py-16 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2a] via-[#14253a] to-[#0f1c2e]" />
        <div className="relative max-w-[900px] mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${KEEPER_BASE}/img/lineup/p_keeper_logo.png`} alt="KeePer" className="h-7 mx-auto mb-5 opacity-50" />
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>カーコーティングメニュー</h1>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            全8種類のKeePer コーティングを詳しく解説。あなたの車と目的に合った最適なコースをお選びください。
          </p>
        </div>
      </section>

      <section className="py-4 px-5 bg-white border-b border-slate-200 sticky top-14 z-30 shadow-sm">
        <div className="max-w-[900px] mx-auto">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {coatingTiers.map(tier => (
              <a key={tier.id} href={`#${tier.id}`}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${tier.is_popular ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                {tier.is_popular && '★ '}{tier.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {coatingTiers.map((tier, index) => {
        const isEven = index % 2 === 0;
        return (
          <section key={tier.id} id={tier.id} className={`py-12 px-5 ${isEven ? 'bg-slate-50/80' : 'bg-white'}`}>
            <div className="max-w-[900px] mx-auto border-l-4 border-l-amber-500 pl-6">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {tier.is_popular && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">人気</span>}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e] leading-tight" style={{ fontFamily: '"Noto Serif JP", serif' }}>{tier.name}</h2>
                  <p className="text-[13px] text-slate-500 mt-1">{tier.tagline}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">SSサイズ〜（税込）</div>
                  <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(tier.prices.SS)}</div>
                </div>
              </div>

              <p className="text-[13px] text-slate-600 leading-relaxed mb-4">{tier.description}</p>

              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-[13px]">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500 w-[100px]">耐久</td>
                      <td className="px-4 py-2">{tier.durability_years}</td>
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500 w-[100px]">施工時間</td>
                      <td className="px-4 py-2">{tier.application_time}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500">メンテ</td>
                      <td className="px-4 py-2">{tier.maintenance_interval}</td>
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500">Web割引</td>
                      <td className="px-4 py-2 text-amber-700 font-bold">{tier.discount_tier}%OFF</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500">艶</td>
                      <td className="px-4 py-2"><Stars rating={tier.gloss_rating} /></td>
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500">撥水</td>
                      <td className="px-4 py-2"><Stars rating={tier.water_repellency_rating} /></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 bg-slate-100 font-semibold text-[11px] text-slate-500">被膜</td>
                      <td className="px-4 py-2 text-xs" colSpan={3}>{tier.layer_count}層 — {tier.layer_description}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto mb-5">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f1c2e] text-white">
                      <th className="px-2.5 py-2 text-left font-medium text-[10px]"></th>
                      {(['SS', 'S', 'M', 'L', 'LL', 'XL'] as const).map(size => (
                        <th key={size} className="px-2.5 py-2 text-center font-medium text-[10px]">{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-2.5 py-2 font-semibold text-[11px] text-slate-600">施工料金</td>
                      {(['SS', 'S', 'M', 'L', 'LL', 'XL'] as const).map(size => (
                        <td key={size} className="px-2.5 py-2 text-center font-bold text-[11px]">{formatPrice(tier.prices[size])}</td>
                      ))}
                    </tr>
                    {tier.maintenance_prices && (
                      <tr className="bg-slate-50 border-t border-slate-100">
                        <td className="px-2.5 py-2 font-semibold text-[11px] text-slate-400">メンテナンス</td>
                        {(['SS', 'S', 'M', 'L', 'LL', 'XL'] as const).map(size => (
                          <td key={size} className="px-2.5 py-2 text-center text-[11px] text-slate-400">{formatPrice(tier.maintenance_prices![size])}</td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2.5 mt-5">
                <Link href={`${base}/price`} className="px-5 py-2 bg-amber-500 text-white font-bold rounded-md text-[13px] hover:bg-amber-600 transition-colors">見積もりシミュレーター →</Link>
                <Link href={`${base}/booking`} className="px-5 py-2 bg-slate-200 text-slate-700 font-bold rounded-md text-[13px] hover:bg-slate-300 transition-colors">予約する</Link>
              </div>
            </div>
          </section>
        );
      })}

      <section className="py-14 px-5 bg-[#0f1c2e]">
        <div className="max-w-[520px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>コース選びに迷ったら</h2>
          <p className="text-sm text-white/40 mb-6">お車の状態やご予算に合わせて最適なコースをご提案します。</p>
          <div className="flex gap-3 justify-center">
            <Link href={`${base}/price`} className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-md text-sm hover:bg-amber-600 transition-colors">見積もりシミュレーター →</Link>
            <Link href={`${base}/booking`} className="px-6 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20 transition-colors">ご予約</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
