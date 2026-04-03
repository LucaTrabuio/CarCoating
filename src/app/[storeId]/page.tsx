import { getStoreById, getStoreCampaign, getNearbyStations } from '@/lib/store-data';
import { notFound } from 'next/navigation';
import { coatingTiers } from '@/data/coating-tiers';
import { SAMPLE_CASES } from '@/data/cases-sample';
import { formatPrice, getWebPrice } from '@/lib/pricing';
import TrustStrip from '@/components/TrustStrip';
import TrustBadges from '@/components/TrustBadges';
import CarSimulator from '@/components/CarSimulator';
import HomeSimulatorLink from '@/components/HomeSimulatorLink';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) return {};
  return {
    title: `${store.store_name}｜KeePer PRO SHOP カーコーティング専門店`,
    description: store.meta_description,
    keywords: store.seo_keywords,
  };
}

export default async function StorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) notFound();

  const campaign = getStoreCampaign(store);
  const stations = getNearbyStations(store);
  const recentCases = [...SAMPLE_CASES]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  const featured = [
    coatingTiers.find(t => t.id === 'crystal')!,
    coatingTiers.find(t => t.id === 'diamond')!,
    coatingTiers.find(t => t.id === 'ex')!,
  ];

  return (
    <main>
      {/* HERO VIDEO SECTION */}
      <section className="relative bg-[#0a0e14] min-h-[350px] max-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Placeholder for looping video */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f1c2e]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center text-white text-2xl">
            &#9654;
          </div>
        </div>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/30">
          水弾き動画 — 全店舗共通アセット（ループ再生・ミュート）
        </p>

        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 pb-5">
          <div className="max-w-[1100px] mx-auto">
            <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              洗車だけで、この輝きが続く。
            </h1>
            <p className="text-white/75 text-sm mb-3">
              {store.store_name} ｜ KeePer PRO SHOP認定
            </p>
            <TrustBadges
              hasBooth={store.has_booth}
              level1Count={store.level1_staff_count}
              level2Count={store.level2_staff_count}
            />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <TrustStrip />

      {/* QUICK SIMULATOR */}
      <section className="py-14 px-5">
        <div className="max-w-[1100px] mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e] mb-1" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            あなたの車の見積もりを30秒で
          </h2>
          <p className="text-sm text-gray-500 mb-6">車種を選ぶだけ。全8プランの料金を即表示。</p>
          <HomeSimulatorLink storeId={storeId} />
        </div>
      </section>

      {/* FEATURED PLANS */}
      <section className="py-14 px-5 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              人気コーティングプラン
            </h2>
            <p className="text-sm text-gray-500 mt-1">Web予約限定 最大{campaign.discount_rate}%OFF</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {featured.map((tier, i) => {
              const webPrice = getWebPrice(tier, 'SS', campaign.discount_rate);
              return (
                <div key={tier.id} className={`bg-white rounded-xl p-6 text-center border-2 ${i === 1 ? 'border-amber-500 relative' : 'border-gray-200'} hover:shadow-lg transition-shadow`}>
                  {i === 1 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-400 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                      ★ 一番人気
                    </span>
                  )}
                  <div className="text-xs text-gray-400 mb-1">{i === 0 ? '手軽に始める' : i === 1 ? 'ベストバリュー' : '最高峰の仕上がり'}</div>
                  <h3 className="font-bold text-lg text-[#0f1c2e] mb-1">{tier.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{tier.durability_years}持続 ｜ {tier.application_time}</p>
                  <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(webPrice)}〜</div>
                  <p className="text-xs text-gray-400">SSサイズ・Web割後</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            <Link href={`/${storeId}/price`} className="text-amber-600 font-semibold hover:underline">全8プランの見積もりシミュレーター →</Link>
          </p>
        </div>
      </section>

      {/* CASE STUDIES PREVIEW */}
      <section className="py-14 px-5">
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

      {/* PROCESS STEPS */}
      <section className="py-14 px-5 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-xl font-bold text-[#0f1c2e] text-center mb-8" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご利用の流れ</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { num: '1', title: '見積もりシミュレーション', desc: '車種を選ぶだけで全プランの料金を表示。PDFでダウンロードも可。' },
              { num: '2', title: 'Web予約（仮予約）', desc: 'カレンダーから希望日時を3つタップ。スタッフが確定連絡。' },
              { num: '3', title: 'ご来店・施工・お引渡し', desc: '朝お預け → お仕事へ → 夕方お引渡し。無料洗車点検2回付き。' },
            ].map(step => (
              <div key={step.num} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <div className="font-bold text-sm">{step.title}</div>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BLOCK */}
      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 rounded-xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>Web予約限定 3大特典</h2>
          <div className="space-y-1.5 mb-4 max-w-[400px] mx-auto text-left">
            <div className="flex items-center gap-2 text-sm font-semibold">✓ 全コーティング 最大{campaign.discount_rate}%OFF</div>
            <div className="flex items-center gap-2 text-sm font-semibold">✓ 施工後の手洗い洗車＆点検 2回無料</div>
            <div className="flex items-center gap-2 text-sm font-semibold">✓ 人気オプション1つ無料（新車ダイヤ系）</div>
          </div>
          <p className="text-xs opacity-80 mb-4">{campaign.deadline}までのWeb予約に限る</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/${storeId}/price`} className="px-6 py-3 bg-white text-[#0f1c2e] font-bold rounded-lg text-sm hover:bg-gray-100 transition-colors">まず見積もり →</Link>
            <Link href={`/${storeId}/booking`} className="px-6 py-3 bg-[#0f1c2e] text-white font-bold rounded-lg text-sm hover:bg-[#1a2d4a] transition-colors">予約する →</Link>
            {store.line_url && (
              <a href={store.line_url} className="px-6 py-3 bg-[#06c755] text-white font-bold rounded-lg text-sm hover:bg-[#05a847] transition-colors">LINE相談</a>
            )}
          </div>
        </div>
      </section>

      {/* STORE ACCESS (compact) */}
      <section className="py-14 px-5 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-xl font-bold text-[#0f1c2e] text-center mb-8" style={{ fontFamily: '"Noto Serif JP", serif' }}>アクセス</h2>
          <div className="grid md:grid-cols-[3fr_2fr] gap-8">
            <div>
              {store.access_map_url ? (
                <iframe
                  src={store.access_map_url.replace('maps?q=', 'maps?q=').replace(' ', '+') + '&output=embed'}
                  className="w-full aspect-[4/3] rounded-xl border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title="店舗の地図"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-xl bg-blue-100 border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-500 text-sm">
                  地図: {store.lat}, {store.lng}
                </div>
              )}
            </div>
            <div>
              <dl className="grid grid-cols-[5em_1fr] gap-y-2 gap-x-4 text-sm">
                <dt className="font-semibold text-[#0f1c2e]">店舗名</dt><dd>{store.store_name}</dd>
                <dt className="font-semibold text-[#0f1c2e]">住所</dt><dd>〒{store.postal_code}<br />{store.address}</dd>
                <dt className="font-semibold text-[#0f1c2e]">営業時間</dt><dd>{store.business_hours}</dd>
                <dt className="font-semibold text-[#0f1c2e]">定休日</dt><dd>{store.regular_holiday}</dd>
                <dt className="font-semibold text-[#0f1c2e]">電話</dt><dd><a href={`tel:${store.tel}`} className="text-amber-600 font-semibold">{store.tel}</a>（通話無料）</dd>
                {stations.length > 0 && (
                  <>
                    <dt className="font-semibold text-[#0f1c2e]">アクセス</dt>
                    <dd>{stations.map(s => `${s.name} ${s.time}`).join('、')}<br />{store.landmark}</dd>
                  </>
                )}
                {store.parking_spaces > 0 && (
                  <>
                    <dt className="font-semibold text-[#0f1c2e]">駐車場</dt><dd>{store.parking_spaces}台</dd>
                  </>
                )}
              </dl>
              <Link href={`/${storeId}/access`} className="text-amber-600 font-semibold text-sm inline-block mt-4 hover:underline">
                詳しい店舗情報・スタッフ紹介 →
              </Link>
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
        </div>
      </section>
    </main>
  );
}
