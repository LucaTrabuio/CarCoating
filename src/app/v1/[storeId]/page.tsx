import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getBaseUrl,
  getStoreByIdAsync,
  getCampaignDefaultsAsync,
  mergeStoreCampaign,
  getNearbyStations,
} from '@/lib/store-data';
import { SAMPLE_CASES } from '@/data/cases-sample';
import { coatingTiers } from '@/data/coating-tiers';
import { getWebPrice, formatPrice } from '@/lib/pricing';
import TrustBadges from '@/components/TrustBadges';
import USPSection from '@/components/USPSection';
import ConcernSection from '@/components/ConcernSection';
import RecommendationQuiz from '@/components/RecommendationQuiz';
import NewsSection from '@/components/NewsSection';
import HomeSimulatorLink from '@/components/HomeSimulatorLink';

export default async function StoreHomePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const baseUrl = await getBaseUrl();
  const store = await getStoreByIdAsync(storeId, baseUrl);

  if (!store) {
    notFound();
  }

  const defaults = await getCampaignDefaultsAsync(baseUrl);
  const campaign = mergeStoreCampaign(store, defaults);
  const discountRate = campaign.discount_rate;
  const stations = getNearbyStations(store);

  const recentCases = [...SAMPLE_CASES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const featured = [
    coatingTiers.find(t => t.id === 'crystal')!,
    coatingTiers.find(t => t.id === 'diamond')!,
    coatingTiers.find(t => t.id === 'dia2')!,
  ];

  return (
    <main>
      {/* HERO */}
      <section className="relative bg-[#0a0e14] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f1c2e]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center text-white text-2xl">&#9654;</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-8 pb-8">
          <div className="max-w-[900px] mx-auto text-center">
            <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              洗車だけで、この輝きが続く。
            </h1>
            <p className="text-white/60 text-sm mb-4">
              {store.store_name} ｜ KeePer PRO SHOP認定 ｜ 特許技術のガラスコーティング
            </p>
            <TrustBadges
              hasBooth={store.has_booth}
              level1Count={store.level1_staff_count}
              level2Count={store.level2_staff_count}
            />
            <div className="flex gap-3 justify-center mt-5">
              <Link href={`/${storeId}/booking`} className="px-7 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors">予約する</Link>
              <Link href={`/${storeId}/booking?mode=inquiry`} className="px-7 py-3 bg-white/10 border border-white/25 text-white font-semibold rounded-lg text-sm hover:bg-white/20 transition-colors">お問い合わせ</Link>
            </div>
          </div>
        </div>
      </section>

      {/* USP — 6 REASONS */}
      <USPSection />

      {/* CONCERNS */}
      <ConcernSection />

      {/* RECOMMENDATION QUIZ */}
      <RecommendationQuiz />

      {/* QUICK SIMULATOR */}
      <section className="py-14 px-5 bg-[#0f1c2e]">
        <div className="max-w-[1100px] mx-auto text-center">
          <h2 className="text-white text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            かんたん見積もり
          </h2>
          <p className="text-white/50 text-sm mb-6">車種を選ぶだけで料金がわかります</p>
          <HomeSimulatorLink storeId={storeId} />
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="py-14 px-5 bg-slate-50">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              施工事例
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
            {recentCases.map((c, i) => (
              <div key={i} className="flex-shrink-0 w-[280px] snap-start rounded-xl overflow-hidden border border-gray-200 bg-white">
                <div className="bg-gray-100 h-[160px] flex items-center justify-center">
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt={c.car} className="w-full h-full object-cover" />
                    : <span className="text-xs text-gray-400">画像準備中</span>
                  }
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-[#0f1c2e]">{c.car}</div>
                  <div className="text-xs text-gray-500">{c.coatingType} ｜ {c.date}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-4">
            <Link href={`/${storeId}/cases`} className="text-amber-600 font-semibold hover:underline">全ての施工事例を見る →</Link>
          </p>
        </div>
      </section>

      {/* FEATURED PRICING */}
      <section className="py-14 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              コーティング料金
            </h2>
            <p className="text-sm text-slate-400 mt-1">Web予約限定 最大{discountRate}%OFF</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {featured.map((tier, i) => {
              const webPrice = getWebPrice(tier, 'SS', discountRate);
              return (
                <div key={tier.id} className={`bg-white rounded-xl p-6 text-center border-2 ${i === 1 ? 'border-amber-500 relative' : 'border-slate-200'}`}>
                  {i === 1 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-400 text-white text-xs font-bold px-3 py-0.5 rounded-full">一番人気</span>
                  )}
                  <h3 className="font-bold text-lg text-[#0f1c2e] mb-1">{tier.name}</h3>
                  <p className="text-xs text-slate-500 mb-3">{tier.durability_years}持続 ｜ {tier.application_time}</p>
                  <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(webPrice)}〜</div>
                  <p className="text-[10px] text-slate-400 mb-3">SSサイズ・Web割後・税込</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm mt-4">
            <Link href={`/${storeId}/coatings`} className="text-amber-600 font-semibold hover:underline">全8コースの詳細を見る →</Link>
          </p>
        </div>
      </section>

      {/* NEWS */}
      <NewsSection />

      {/* PROCESS STEPS */}
      <section className="py-14 px-5 bg-slate-50">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-xl font-bold text-[#0f1c2e] text-center mb-8" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご利用の流れ</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { num: '1', title: '見積もり・ご相談', desc: 'Webまたはお電話でお気軽に。おすすめ診断で最適なコースをご提案。' },
              { num: '2', title: 'Web予約（仮予約）', desc: 'カレンダーから希望日時を3つ選択。スタッフが確定連絡します。' },
              { num: '3', title: 'ご来店・施工・お引渡し', desc: '朝お預け → お仕事へ → 夕方お引渡し。無料洗車点検2回付き。' },
            ].map(step => (
              <div key={step.num} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0">{step.num}</div>
                <div>
                  <div className="font-bold text-sm">{step.title}</div>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 BENEFITS CTA */}
      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 rounded-xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>Web予約限定 5大特典</h2>
          <div className="space-y-2 mb-4 max-w-[480px] mx-auto text-left">
            {[
              `全コーティング 最大${discountRate}%OFF`,
              '新車ダイヤ系ご予約で人気オプション1つ無料',
              'オプション全メニュー10%OFF',
              '施工後の手洗い洗車＆点検を2回無料',
              'かんたん除菌を無料実施',
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm font-semibold">
                <span className="bg-white/20 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                {b}
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/${storeId}/booking`} className="px-6 py-3 bg-white text-[#0f1c2e] font-bold rounded-lg text-sm hover:bg-gray-100 transition-colors">予約する →</Link>
            <Link href={`/${storeId}/booking?mode=inquiry`} className="px-6 py-3 bg-[#0f1c2e] text-white font-bold rounded-lg text-sm hover:bg-[#1a2d4a] transition-colors">お問い合わせ →</Link>
          </div>
        </div>
      </section>

      {/* STORE ACCESS */}
      <section className="py-14 px-5 bg-slate-50">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              店舗アクセス
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
              <iframe
                src={`https://maps.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed`}
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${store.store_name} 地図`}
              />
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-[#0f1c2e] mb-1">{store.store_name}</h3>
                <p className="text-sm text-gray-600">{store.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">営業時間</div>
                  <div className="font-semibold text-[#0f1c2e]">{store.business_hours}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">定休日</div>
                  <div className="font-semibold text-[#0f1c2e]">{store.regular_holiday}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">電話番号</div>
                  <a href={`tel:${store.tel}`} className="font-bold text-amber-600">{store.tel}</a>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">駐車場</div>
                  <div className="font-semibold text-[#0f1c2e]">{store.parking_spaces}台</div>
                </div>
              </div>

              {/* Nearby stations */}
              {stations.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">最寄り駅</div>
                  <div className="space-y-1">
                    {stations.map((s, i) => (
                      <div key={i} className="text-sm text-[#0f1c2e]">
                        {s.name}（{s.time}）
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {store.landmark && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">目印</div>
                  <div className="text-sm text-[#0f1c2e]">{store.landmark}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gray-900 text-white py-10 text-center">
        <div className="max-w-[1100px] mx-auto px-5">
          <div className="text-lg font-bold mb-1">ご予約・お見積もりはお気軽に</div>
          <div className="text-sm opacity-50 mb-4">電話予約でもWeb予約限定割引が適用されます</div>
          <a href={`tel:${store.tel}`} className="text-3xl font-bold text-amber-500 block mb-1">{store.tel}</a>
          <div className="text-xs opacity-40">通話無料 ｜ {store.business_hours}</div>
          {store.line_url && (
            <a
              href={store.line_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm"
            >
              LINEで相談する
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
