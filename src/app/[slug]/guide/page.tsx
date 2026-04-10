import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import { formatPrice, getPriceForSize, parsePriceOverrides } from '@/lib/pricing';
import { KEEPER_BASE } from '@/lib/constants';
import { parseGuideConfig, getCustomizedTiers } from '@/lib/guide-config';
import { getMasterCoatingTiers } from '@/lib/master-data';
import type { Metadata } from 'next';
import type { CoatingTier } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  const storeName = resolved?.subCompanyName ?? resolved?.store.store_name ?? 'KeePer PRO SHOP';
  return {
    title: `コーティングガイド｜${storeName}`,
    description: `カーコーティングの基礎知識、8種類のKeePerコーティングの違い、選び方、お手入れ方法まで、初めての方向けに詳しく解説します。`,
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

// CSS diagram of coating layers — more reliable than fetching remote images
function LayerDiagram({ tier }: { tier: CoatingTier }) {
  // Split the layer_description by common separators into labeled bands
  const segments = tier.layer_description
    .split(/[+＋]/)
    .map(s => s.trim())
    .filter(Boolean);

  const layerColors = [
    'bg-gradient-to-r from-sky-100 to-cyan-100 text-cyan-800 border-cyan-200',
    'bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-800 border-amber-200',
    'bg-gradient-to-r from-indigo-50 to-purple-100 text-indigo-800 border-indigo-200',
    'bg-gradient-to-r from-emerald-50 to-teal-100 text-teal-800 border-teal-200',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-[10px] text-slate-400 font-bold mb-2">被膜構造</div>
      <div className="space-y-1">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 rounded text-[11px] font-medium border ${layerColors[i % layerColors.length]}`}
          >
            層{i + 1}: {seg}
          </div>
        ))}
        <div className="px-3 py-1.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          塗装面（下地）
        </div>
      </div>
    </div>
  );
}

const BENEFITS = [
  {
    icon: '✨',
    title: '圧倒的な艶と輝き',
    body: '塗装表面の微細な凹凸を埋め、光の反射を整えることで、深い透明感と艶を実現します。新車以上の仕上がりを生むコースもあります。',
  },
  {
    icon: '🛡️',
    title: '塗装を長期間保護',
    body: '紫外線・酸性雨・鉄粉・黄砂・花粉などから塗装面を守り、クリア層の劣化を遅らせます。結果として再塗装のコストを抑えられます。',
  },
  {
    icon: '💧',
    title: '洗車が驚くほどラクに',
    body: '撥水性によって水と一緒に汚れが流れ落ちやすくなり、洗車時間を大幅に短縮。水垢やイオンデポジットの発生も抑えます。',
  },
  {
    icon: '💹',
    title: '下取り・査定で有利に',
    body: '塗装の劣化を防ぐことで、数年後の車両価値を維持。特に経年車では、施工の有無で査定額に差が出ることがあります。',
  },
];

const TIER_GROUPS = [
  {
    label: 'エントリー',
    subLabel: 'Entry',
    description: '初めてのコーティングに。手軽な価格でガラスの輝きを。',
    tierIds: ['crystal', 'fresh'],
    color: 'bg-sky-50 border-sky-200 text-sky-900',
    accent: 'text-sky-700',
  },
  {
    label: 'スタンダード',
    subLabel: 'Standard',
    description: '長期所有・数年単位で考える方に最適。KeePerの人気帯。',
    tierIds: ['diamond', 'diamond-premium'],
    color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    accent: 'text-emerald-700',
  },
  {
    label: 'プレミアム',
    subLabel: 'Premium',
    description: '2層ガラス構造で最長6年。メンテナンスで輝きを維持。',
    tierIds: ['dia2', 'dia2-premium'],
    color: 'bg-violet-50 border-violet-200 text-violet-900',
    accent: 'text-violet-700',
  },
  {
    label: 'アルティメット',
    subLabel: 'Ultimate',
    description: 'EXキーパー。圧倒的な膜厚と最高峰の艶。',
    tierIds: ['ex', 'ex-premium'],
    color: 'bg-amber-50 border-amber-200 text-amber-900',
    accent: 'text-amber-700',
  },
];

const CHOOSE_QUESTIONS = [
  {
    q: '新車ですか？中古車・経年車ですか？',
    a: '新車であれば研磨なしの通常コース（クリスタル／ダイヤモンド／ダイヤⅡ／EX）で十分。経年車やくすみが気になる場合は「プレミアム（研磨付き）」コースをおすすめします。',
  },
  {
    q: '何年乗り続ける予定ですか？',
    a: '1〜2年で乗り換え予定ならクリスタル or フレッシュ。3〜5年ならダイヤモンドかダイヤⅡ。長期所有（5年以上）ならEXキーパー or ダイヤⅡキーパーがおすすめです。',
  },
  {
    q: '駐車場は屋根付き？屋外？',
    a: '青空駐車で汚れが気になる方はフレッシュキーパーの防汚性能が活きます。屋根付き駐車でも紫外線対策は重要で、上位グレードほど長期的に有利です。',
  },
  {
    q: 'メンテナンスにどこまで時間を割けますか？',
    a: 'メンテなし3年が可能なダイヤモンド／ダイヤⅡなら手間いらず。年1回のメンテナンスができるならEXキーパーが最高の選択です。',
  },
];

const MAINTENANCE_TIPS = [
  {
    num: '01',
    title: '月1〜2回の水洗いで十分',
    body: 'コーティング後は基本的に水洗いのみで汚れが落ちます。シャンプーを使う場合はコーティング車用の中性シャンプーを選びましょう。',
  },
  {
    num: '02',
    title: '洗車機は中性シャンプーのものを',
    body: '撥水系・ワックス系洗車機はコーティング被膜を傷めることがあります。スタンドの「シャンプー洗車」で十分です。',
  },
  {
    num: '03',
    title: '拭き取りはマイクロファイバークロスで',
    body: '硬い布や古いタオルは細かい傷の原因に。十分に濡らしてから、必ず柔らかいマイクロファイバークロスで一方向に拭き取ります。',
  },
  {
    num: '04',
    title: '鳥のフン・虫の死骸は早めに除去',
    body: '酸性の強い汚れは放置するとシミになります。見つけたら水で柔らかくしてからゆっくり拭き取ってください。',
  },
  {
    num: '05',
    title: '定期メンテナンスで本来の性能を回復',
    body: 'ダイヤモンド／ダイヤⅡ／EXキーパーは、推奨サイクルでメンテナンスを行うことで撥水力と艶を最大限に維持できます。',
  },
];

const FAQ = [
  {
    q: 'コーティングはワックスと何が違うのですか？',
    a: 'ワックスは油分主体で数週間〜数ヶ月で流れ落ちますが、KeePerコーティングは塗装面に定着する無機ガラス被膜です。耐久年数・防汚性・艶の持続力がまったく違います。',
  },
  {
    q: '納車直後が一番いいタイミングですか？',
    a: 'はい。新車は塗装の状態が最も良いので、そのまま被膜をかぶせることで最高の仕上がりが得られます。ただし中古車でも、プレミアム（研磨付き）コースなら新車以上の仕上がりも可能です。',
  },
  {
    q: '施工時間はどれくらい？代車はありますか？',
    a: 'クリスタル／フレッシュは約2時間、ダイヤモンド以上は半日〜1日が目安です。代車サービスの有無は店舗ごとに異なりますので、ご予約時にお問い合わせください。',
  },
  {
    q: '雨の日に施工できますか？',
    a: '基本的に屋内のコーティングブースで施工するため、天候に左右されません。ただし施工後12時間は雨に当てない方が定着がよくなります。',
  },
  {
    q: '施工後、いつから洗車できますか？',
    a: '施工翌日以降であれば水洗いが可能です。初回のメンテナンスまで、強いシャンプー洗車は避けるのがおすすめです。',
  },
  {
    q: '料金はどの車種でも同じですか？',
    a: 'いいえ。ボディサイズ（SS〜XL）で料金が変わります。軽自動車・コンパクトカーから大型ミニバン・輸入SUVまで、6サイズで価格を設定しています。正確な料金は見積もりシミュレーターでご確認いただけます。',
  },
];

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();
  const { store } = resolved;

  const base = `/${slug}`;
  const priceOverrides = parsePriceOverrides(store.price_overrides);
  const guideConfig = parseGuideConfig(store.guide_config);
  const hidePrices = guideConfig.hide_prices === true;
  const baseTiers = await getMasterCoatingTiers();
  const tiers = getCustomizedTiers(guideConfig, baseTiers);
  const tiersById = new Map(tiers.map(t => [t.id, t]));

  return (
    <main>
      {/* Hero */}
      <section className="bg-[#0C3290] py-16 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2a] via-[#14253a] to-[#0C3290]" />
        <div className="relative max-w-[900px] mx-auto">
          <Image
            src={`${KEEPER_BASE}/img/lineup/p_keeper_logo.png`}
            alt="KeePer"
            width={80}
            height={28}
            className="h-7 w-auto mx-auto mb-5 opacity-50"
          />
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
            コーティングガイド
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            はじめての方向けに、カーコーティングの基礎知識から8種類のKeePerメニューの違い、<br className="hidden md:inline" />
            選び方、お手入れのコツまで詳しく解説します。
          </p>
        </div>
      </section>

      {/* TOC */}
      <section className="py-4 px-5 bg-white border-b border-slate-200 sticky top-14 z-30 shadow-sm">
        <div className="max-w-[900px] mx-auto">
          <div className="flex flex-wrap gap-1.5 justify-center text-[11px]">
            <a href="#why" className="px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold">なぜコーティング?</a>
            <a href="#how" className="px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold">仕組み</a>
            <a href="#tiers" className="px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200 font-semibold">8種類のグレード</a>
            <a href="#choose" className="px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold">選び方</a>
            <a href="#care" className="px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold">お手入れ</a>
            <a href="#faq" className="px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold">よくある質問</a>
          </div>
        </div>
      </section>

      {/* Why coat? */}
      <section id="why" className="py-16 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] text-amber-600 font-bold tracking-widest mb-2">WHY COATING?</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              なぜカーコーティングするのか？
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              「艶出し」だけじゃない、コーティングが解決する4つのこと。
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-3xl mb-2">{b.icon}</div>
                <h3 className="text-sm font-bold text-[#0C3290] mb-1.5">{b.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 px-5 bg-slate-50">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] text-amber-600 font-bold tracking-widest mb-2">HOW IT WORKS</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              KeePerコーティングの仕組み
            </h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-sm font-bold text-[#0C3290]">洗浄・下地処理</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  鉄粉・水垢・油分を徹底的に除去。プレミアムコースでは研磨工程で経年のくすみも除去します。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-sm font-bold text-[#0C3290]">被膜の塗布</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  グレードごとに1〜4層のガラス・レジン被膜を塗布。層が多いほど膜厚と耐久性が上がります。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-sm font-bold text-[#0C3290]">硬化・仕上げ</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  被膜を定着させ、ムラ・曇りがないか最終チェック。完全硬化まで12時間ほどが目安です。
                </p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
              <strong className="text-[#0C3290]">ポイント：</strong>
              KeePerの上位コースは「ガラス被膜＋レジン被膜」のW構造を採用。ガラスの透明感と硬さに加え、
              レジン層が微細な凹凸を埋めることで、塗装単体では出せない深い艶を実現しています。
            </div>
          </div>
        </div>
      </section>

      {/* 4 tier groups overview */}
      <section id="tiers" className="py-16 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] text-amber-600 font-bold tracking-widest mb-2">THE 8 LINEUPS</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              8種類のKeePerコーティング
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              目的・ご予算・所有期間に合わせて4つのグレード帯から選べます。
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {TIER_GROUPS.map((group, gi) => (
              <div key={gi} className={`border rounded-xl p-5 ${group.color}`}>
                <div className={`text-[10px] font-bold tracking-widest mb-1 ${group.accent}`}>
                  {group.subLabel.toUpperCase()}
                </div>
                <h3 className="text-lg font-bold mb-1" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{group.label}</h3>
                <p className="text-xs leading-relaxed opacity-80 mb-3">{group.description}</p>
                <ul className="space-y-1">
                  {group.tierIds.map(tid => {
                    const t = tiersById.get(tid);
                    if (!t) return null;
                    const price = getPriceForSize(t, 'SS', priceOverrides);
                    return (
                      <li key={tid} className="text-xs flex items-center justify-between">
                        <span className="font-medium">{t.is_popular && '★ '}{t.name}</span>
                        {!hidePrices && (
                          <span className="text-[10px] opacity-70 font-mono">{formatPrice(price)}〜</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Per-tier detail cards */}
          <div className="space-y-4">
            {tiers.map(tier => {
              const price = getPriceForSize(tier, 'SS', priceOverrides);
              return (
                <div key={tier.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid md:grid-cols-[1fr_auto] gap-0">
                    <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-slate-100">
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base md:text-lg font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
                              {tier.name}
                            </h3>
                            {tier.is_popular && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">人気</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{tier.name_en}</div>
                        </div>
                        {!hidePrices && (
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500">SSサイズ〜</div>
                            <div className="text-lg font-bold text-amber-600 tabular-nums">{formatPrice(price)}</div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{tier.description}</p>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
                        <strong className="font-bold">特徴：</strong>{tier.key_differentiator}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">Gloss</div>
                          <div className="text-xs"><Stars rating={tier.gloss_rating} /></div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">撥水</div>
                          <div className="text-xs"><Stars rating={tier.water_repellency_rating} /></div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">耐久</div>
                          <div className="text-xs font-semibold text-slate-700">{tier.durability_years}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">施工時間</div>
                          <div className="text-xs font-semibold text-slate-700">{tier.application_time}</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 md:p-6 bg-slate-50/60 min-w-[200px]">
                      <LayerDiagram tier={tier} />
                      <div className="text-[10px] text-slate-500 mt-2">
                        <strong>メンテナンス：</strong>{tier.maintenance_interval}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to choose */}
      <section id="choose" className="py-16 px-5 bg-slate-50">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] text-amber-600 font-bold tracking-widest mb-2">HOW TO CHOOSE</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              選び方ガイド
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              4つの質問に答えれば、あなたに合ったグレードが見えてきます。
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {CHOOSE_QUESTIONS.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-lg font-bold text-amber-600 shrink-0">Q{i + 1}.</span>
                  <h3 className="text-sm font-bold text-[#0C3290] leading-snug">{item.q}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-7">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Maintenance */}
      <section id="care" className="py-16 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] text-amber-600 font-bold tracking-widest mb-2">MAINTENANCE</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              施工後のお手入れ
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              コーティング本来の性能を長く引き出すための5つのコツ。
            </p>
          </div>
          <div className="space-y-3">
            {MAINTENANCE_TIPS.map(tip => (
              <div key={tip.num} className="flex gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-2xl font-bold text-amber-500 tabular-nums shrink-0" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0C3290] mb-1">{tip.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-5 bg-slate-50">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] text-amber-600 font-bold tracking-widest mb-2">FAQ</div>
            <h2 className="text-xl md:text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              よくある質問
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="bg-white border border-slate-200 rounded-xl group">
                <summary className="cursor-pointer px-5 py-4 flex items-start gap-3 list-none">
                  <span className="text-sm font-bold text-amber-600 shrink-0">Q.</span>
                  <span className="text-sm font-bold text-[#0C3290] flex-1 leading-snug">{item.q}</span>
                  <span className="text-slate-400 text-xs shrink-0 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 pl-[2.75rem]">
                  <p className="text-xs text-slate-600 leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5 bg-[#0C3290] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2a] via-[#14253a] to-[#0C3290]" />
        <div className="relative max-w-[700px] mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
            あなたのお車に最適な一枚を
          </h2>
          <p className="text-white/50 text-xs mb-8 leading-relaxed">
            気になるグレードが見つかったら、メニュー一覧から詳細をチェック。<br />
            見積もりシミュレーターで正確な料金もすぐに確認できます。
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={`${base}/coatings`}
              className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors"
            >
              メニュー一覧を見る →
            </Link>
            <Link
              href={`${base}/price`}
              className="px-6 py-3 bg-white/10 text-white font-bold rounded-lg text-sm hover:bg-white/20 transition-colors border border-white/20"
            >
              見積もりシミュレーター
            </Link>
            <Link
              href={`${base}/booking`}
              className="px-6 py-3 bg-white text-[#0C3290] font-bold rounded-lg text-sm hover:bg-white/90 transition-colors"
            >
              予約する
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
