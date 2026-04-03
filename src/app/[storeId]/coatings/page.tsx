import { getStoreById, getAllStoreIds, getStoreCampaign } from '@/lib/store-data';
import { notFound } from 'next/navigation';
import { coatingTiers } from '@/data/coating-tiers';
import { formatPrice } from '@/lib/pricing';
import Link from 'next/link';

export async function generateStaticParams() {
  return getAllStoreIds().map(id => ({ storeId: id }));
}

export async function generateMetadata({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) return {};
  return {
    title: `コーティングメニュー一覧｜${store.store_name}｜KeePer PRO SHOP`,
    description: `${store.store_name}のカーコーティング全8メニューを詳しく解説。各コースの特徴・構造・耐久年数・価格を比較できます。`,
  };
}

function GlossStars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default async function CoatingsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) notFound();

  const campaign = getStoreCampaign(store);

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] py-14 px-5 text-center">
        <div className="max-w-[900px] mx-auto">
          <div className="text-amber-500 text-xs font-semibold mb-2">KeePer PRO SHOP MENU</div>
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            カーコーティングメニュー
          </h1>
          <p className="text-white/50 text-sm max-w-lg mx-auto">
            全8種類のKeePer コーティングメニューを詳しく解説。あなたの車と目的に合った最適なコースをお選びください。
          </p>
        </div>
      </section>

      {/* QUICK NAV */}
      <section className="py-6 px-5 bg-gray-50 border-b border-gray-200">
        <div className="max-w-[900px] mx-auto">
          <p className="text-xs text-gray-400 mb-3 font-semibold">メニュー一覧（クリックで移動）</p>
          <div className="flex flex-wrap gap-2">
            {coatingTiers.map(tier => (
              <a
                key={tier.id}
                href={`#${tier.id}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  tier.is_popular
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {tier.is_popular && '★ '}{tier.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* HOW COATING WORKS */}
      <section className="py-12 px-5">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-xl font-bold text-[#0f1c2e] text-center mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            カーコーティングとは？
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8 max-w-[600px] mx-auto">
            車のボディ表面にガラスやレジンの被膜を形成し、塗装を紫外線・酸性雨・汚れから守る施工です。ワックスとは異なり、化学結合による被膜は数年単位で持続します。
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: '防汚・撥水', desc: '雨や泥が弾かれ、洗車だけでキレイな状態をキープ。洗車回数が大幅に減ります。' },
              { title: '紫外線カット', desc: '塗装の色褪せ・劣化を防止。特に濃色車で効果が顕著です。' },
              { title: '艶・光沢UP', desc: 'ガラス被膜が光を均一に反射し、新車以上の深い艶を実現します。' },
            ].map(item => (
              <div key={item.title} className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-bold text-sm text-[#0f1c2e] mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIER DETAILS */}
      {coatingTiers.map((tier, index) => (
        <section
          key={tier.id}
          id={tier.id}
          className={`py-12 px-5 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
        >
          <div className="max-w-[900px] mx-auto">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {tier.is_popular && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">人気</span>
                  )}
                  <span className="text-[10px] text-gray-400 font-semibold">{tier.name_en}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
                  {tier.name}
                </h2>
                <p className="text-sm text-amber-700 font-semibold mt-1">{tier.tagline}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">SSサイズ〜</div>
                <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(tier.prices.SS)}</div>
                <div className="text-xs text-gray-400">（税込）</div>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-6">{tier.description}</p>

            {/* Spec grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs w-[120px]">耐久年数</td>
                      <td className="px-4 py-2.5">{tier.durability_years}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs">施工時間</td>
                      <td className="px-4 py-2.5">{tier.application_time}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs">メンテナンス</td>
                      <td className="px-4 py-2.5">{tier.maintenance_interval}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs">Web割引率</td>
                      <td className="px-4 py-2.5 text-amber-700 font-bold">{tier.discount_tier}%OFF</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs w-[120px]">艶・光沢</td>
                      <td className="px-4 py-2.5"><GlossStars rating={tier.gloss_rating} /></td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs">撥水性能</td>
                      <td className="px-4 py-2.5"><GlossStars rating={tier.water_repellency_rating} /></td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs">被膜構成</td>
                      <td className="px-4 py-2.5 text-xs">{tier.layer_description}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 bg-gray-50 font-semibold text-xs">層数</td>
                      <td className="px-4 py-2.5">{tier.layer_count}層</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key differentiator */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-xs font-semibold text-amber-800 mb-1">このコースのポイント</p>
              <p className="text-sm text-amber-900">{tier.key_differentiator}</p>
            </div>

            {/* Size-based pricing table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold">サイズ</th>
                    <th className="px-3 py-2 font-semibold">SS<div className="font-normal text-gray-400">軽自動車</div></th>
                    <th className="px-3 py-2 font-semibold">S<div className="font-normal text-gray-400">小型車</div></th>
                    <th className="px-3 py-2 font-semibold">M<div className="font-normal text-gray-400">中型車</div></th>
                    <th className="px-3 py-2 font-semibold">L<div className="font-normal text-gray-400">大型車</div></th>
                    <th className="px-3 py-2 font-semibold">LL<div className="font-normal text-gray-400">ミニバン</div></th>
                    <th className="px-3 py-2 font-semibold">XL<div className="font-normal text-gray-400">特大車</div></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-semibold">施工料金</td>
                    {(['SS', 'S', 'M', 'L', 'LL', 'XL'] as const).map(size => (
                      <td key={size} className="px-3 py-2 text-center font-bold">{formatPrice(tier.prices[size])}</td>
                    ))}
                  </tr>
                  {tier.maintenance_prices && (
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 font-semibold text-gray-500">メンテナンス</td>
                      {(['SS', 'S', 'M', 'L', 'LL', 'XL'] as const).map(size => (
                        <td key={size} className="px-3 py-2 text-center text-gray-500">{formatPrice(tier.maintenance_prices![size])}</td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-center">
              <Link
                href={`/${storeId}/price`}
                className="text-amber-600 text-sm font-semibold hover:underline"
              >
                見積もりシミュレーターで詳しく確認 →
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-12 px-5 bg-[#0f1c2e]">
        <div className="max-w-[600px] mx-auto text-center text-white">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            コース選びに迷ったら
          </h2>
          <p className="text-sm opacity-60 mb-6">お車の状態やご予算に合わせて最適なコースをご提案します。お気軽にご相談ください。</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={`/${storeId}/price`}
              className="px-6 py-3 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              見積もりシミュレーター →
            </Link>
            <Link
              href={`/${storeId}/booking`}
              className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              ご予約 →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
