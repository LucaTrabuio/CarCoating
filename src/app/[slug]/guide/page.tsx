import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import { formatPrice, getPriceForSize, parsePriceOverrides } from '@/lib/pricing';
import { parseGuideConfig, getCustomizedTiers } from '@/lib/guide-config';
import { getMasterCoatingTiers } from '@/lib/master-data';
import GuideHero from '@/components/GuideHero';
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

interface TierVisual {
  car: string;
  logo: string;
  bg: string;
  detailsUrl?: string;
}

const TIER_VISUALS: Record<string, TierVisual> = {
  crystal: { car: '/images/keeper-tiers/p_coating01.png', logo: '/images/keeper-tiers/p_idx_crystal_logo.png', bg: '#e8f6fb', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/crystal/' },
  fresh: { car: '/images/keeper-tiers/p_coating07.png', logo: '/images/keeper-tiers/p_idx_fresh_logo.png', bg: '#fff9d9', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/fresh/' },
  diamond: { car: '/images/keeper-tiers/p_coating02.png', logo: '/images/keeper-tiers/p_idx_dia2_series_logo.png', bg: '#f2edda', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/dia2_series/' },
  'diamond-premium': { car: '/images/keeper-tiers/p_coating02.png', logo: '/images/keeper-tiers/p_idx_dia2_series_logo.png', bg: '#f2edda', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/dia2_series/' },
  dia2: { car: '/images/keeper-tiers/p_coating09.png', logo: '/images/keeper-tiers/p_idx_dia2_logo.png', bg: '#fefae6', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/dia2/' },
  'dia2-premium': { car: '/images/keeper-tiers/p_coating09.png', logo: '/images/keeper-tiers/p_idx_dia2_logo.png', bg: '#fefae6', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/dia2/' },
  ex: { car: '/images/keeper-tiers/p_coating05.jpg', logo: '/images/keeper-tiers/p_idx_ex_logo.png', bg: '#ffffff', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/exkeeper/' },
  'ex-premium': { car: '/images/keeper-tiers/p_coating05.jpg', logo: '/images/keeper-tiers/p_idx_ex_logo.png', bg: '#ffffff', detailsUrl: 'https://www.keepercoating.jp/lineup/coating/exkeeper/' },
};

const TIER_GROUPS = [
  {
    label: 'エントリー',
    subLabel: 'Entry',
    description: '初めてのコーティングに。手軽な価格でガラスの輝きを。',
    tierIds: ['crystal', 'fresh'],
    color: 'bg-slate-50 border-slate-200 text-slate-900 border-l-4 border-l-amber-200',
    accent: 'text-amber-700',
    badge: '01',
  },
  {
    label: 'スタンダード',
    subLabel: 'Standard',
    description: '長期所有・数年単位で考える方に最適。KeePerの人気帯。',
    tierIds: ['diamond', 'diamond-premium'],
    color: 'bg-slate-50 border-slate-200 text-slate-900 border-l-4 border-l-amber-300',
    accent: 'text-amber-700',
    badge: '02',
  },
  {
    label: 'プレミアム',
    subLabel: 'Premium',
    description: '2層ガラス構造で最長6年。メンテナンスで輝きを維持。',
    tierIds: ['dia2', 'dia2-premium'],
    color: 'bg-slate-50 border-slate-200 text-slate-900 border-l-4 border-l-amber-400',
    accent: 'text-amber-700',
    badge: '03',
  },
  {
    label: 'アルティメット',
    subLabel: 'Ultimate',
    description: 'EXキーパー。圧倒的な膜厚と最高峰の艶。',
    tierIds: ['ex', 'ex-premium'],
    color: 'bg-slate-50 border-slate-200 text-slate-900 border-l-4 border-l-amber-500',
    accent: 'text-amber-700',
    badge: '04',
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
      <GuideHero
        title="コーティングガイド"
        subtitle="はじめての方向けに、カーコーティングの基礎知識から8種類のKeePerメニューの違い、選び方、お手入れのコツまで詳しく解説します。"
        imageSrc="/images/dia2-banner-wide.png"
      />

      {/* TOC */}
      <section className="py-4 bg-white border-b border-slate-200 sticky top-14 z-30 shadow-sm">
        <div className="max-w-[900px] mx-auto">
          <div className="flex flex-nowrap gap-1.5 text-[11px] overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <a href="#why" className="shrink-0 px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold whitespace-nowrap">なぜコーティング?</a>
            <a href="#how" className="shrink-0 px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold whitespace-nowrap">仕組み</a>
            <a href="#tiers" className="shrink-0 px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold whitespace-nowrap">8種類のグレード</a>
            <a href="#choose" className="shrink-0 px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold whitespace-nowrap">選び方</a>
            <a href="#care" className="shrink-0 px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold whitespace-nowrap">お手入れ</a>
            <a href="#faq" className="shrink-0 px-3 py-1.5 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold whitespace-nowrap">よくある質問</a>
          </div>
        </div>
      </section>

      {/* Why coat? */}
      <section id="why" className="py-16 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-amber-600 font-bold tracking-[0.2em] mb-2">WHY COATING?</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] after:content-[''] after:block after:w-12 after:h-1 after:bg-amber-500 after:mx-auto after:mt-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              なぜカーコーティングするのか？
            </h2>
            <p className="text-base text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              「艶出し」だけじゃない、コーティングが解決する4つのこと。
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-3xl mb-2">{b.icon}</div>
                <h3 className="text-base font-bold text-[#0C3290] mb-1.5">{b.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 px-5 bg-slate-50">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-amber-600 font-bold tracking-[0.2em] mb-2">HOW IT WORKS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] after:content-[''] after:block after:w-12 after:h-1 after:bg-amber-500 after:mx-auto after:mt-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              KeePerコーティングの仕組み
            </h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-base font-bold text-[#0C3290]">洗浄・下地処理</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  鉄粉・水垢・油分を徹底的に除去。プレミアムコースでは研磨工程で経年のくすみも除去します。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-base font-bold text-[#0C3290]">被膜の塗布</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  グレードごとに1〜4層のガラス・レジン被膜を塗布。層が多いほど膜厚と耐久性が上がります。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-base font-bold text-[#0C3290]">硬化・仕上げ</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  被膜を定着させ、ムラ・曇りがないか最終チェック。完全硬化まで12時間ほどが目安です。
                </p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500 leading-relaxed">
              <strong className="text-[#0C3290]">ポイント：</strong>
              KeePerの上位コースは「ガラス被膜＋レジン被膜」のW構造を採用。ガラスの透明感と硬さに加え、
              レジン層が微細な凹凸を埋めることで、塗装単体では出せない深い艶を実現しています。
            </div>
          </div>
        </div>
      </section>

      {/* 4 tier groups overview */}
      <section id="tiers" className="py-16 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-amber-600 font-bold tracking-[0.2em] mb-2">THE 8 LINEUPS</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] after:content-[''] after:block after:w-12 after:h-1 after:bg-amber-500 after:mx-auto after:mt-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              8種類のKeePerコーティング
            </h2>
            <p className="text-base text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              目的・ご予算・所有期間に合わせて4つのグレード帯から選べます。
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {TIER_GROUPS.map((group, gi) => (
              <div key={gi} className={`border rounded-xl p-5 ${group.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-300 tabular-nums">{group.badge}</span>
                  <span className={`text-xs font-bold tracking-[0.2em] ${group.accent}`}>
                    {group.subLabel.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-black mb-1 tracking-tight" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{group.label}</h3>
                <p className="text-sm leading-relaxed text-slate-600 mb-3">{group.description}</p>
                <ul className="space-y-1">
                  {group.tierIds.map(tid => {
                    const t = tiersById.get(tid);
                    if (!t) return null;
                    const price = getPriceForSize(t, 'SS', priceOverrides);
                    return (
                      <li key={tid} className="text-sm flex items-center justify-between">
                        <span className="font-medium">{t.is_popular && '★ '}{t.name}</span>
                        {!hidePrices && (
                          <span className="text-xs text-slate-500 font-mono tabular-nums">{formatPrice(price)}〜</span>
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
              const visual = TIER_VISUALS[tier.id];
              return (
                <div key={tier.id} id={`tier-${tier.id}`} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-stretch scroll-mt-24">
                  {visual && (
                    <div className="shrink-0 w-full h-28 sm:w-32 md:w-44 sm:h-auto sm:self-stretch sm:flex sm:items-end" aria-hidden>
                      <div
                        className="relative w-full h-full sm:h-3/4 rounded-lg overflow-hidden bg-no-repeat bg-[length:auto_85%] bg-[position:right_bottom]"
                        style={{
                          backgroundColor: visual.bg,
                          backgroundImage: `url(${visual.car})`,
                        }}
                      >
                        <img
                          src={visual.logo}
                          alt=""
                          className="absolute top-1.5 left-1.5 h-auto w-[35%] max-w-[120px] object-contain sm:top-1 sm:left-1 sm:right-1 sm:w-[calc(100%-0.5rem)] sm:max-w-none"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
                    <div className="grid md:grid-cols-[1fr_260px] gap-0">
                      <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-slate-100">
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg md:text-xl font-black text-[#0C3290] tracking-tight" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
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
                            <div className="text-lg font-bold text-[#0C3290] tabular-nums">{formatPrice(price)}<span className="text-slate-400 text-sm font-normal">〜</span></div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{tier.description}</p>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
                        <strong className="font-bold">特徴：</strong>{tier.key_differentiator}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gloss</div>
                          <div className="text-sm"><Stars rating={tier.gloss_rating} /></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">撥水</div>
                          <div className="text-sm"><Stars rating={tier.water_repellency_rating} /></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">耐久</div>
                          <div className="text-sm font-bold text-[#0C3290] tabular-nums">{tier.durability_years}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">施工時間</div>
                          <div className="text-sm font-bold text-[#0C3290] tabular-nums">{tier.application_time}</div>
                        </div>
                      </div>
                      {visual?.detailsUrl && (
                        <div className="mt-4 text-right">
                          <a
                            href={visual.detailsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-[#0C3290] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#0a2a78] transition-colors"
                          >
                            詳しく見る →
                          </a>
                        </div>
                      )}
                    </div>
                      <div className="p-5 md:p-6 bg-slate-50/60">
                        <LayerDiagram tier={tier} />
                        <div className="text-[10px] text-slate-500 mt-2">
                          <strong>メンテナンス：</strong>{tier.maintenance_interval}
                        </div>
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
            <div className="text-xs text-amber-600 font-bold tracking-[0.2em] mb-2">HOW TO CHOOSE</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] after:content-[''] after:block after:w-12 after:h-1 after:bg-amber-500 after:mx-auto after:mt-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              選び方ガイド
            </h2>
            <p className="text-base text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              4つの質問に答えれば、あなたに合ったグレードが見えてきます。
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {CHOOSE_QUESTIONS.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-lg font-bold text-amber-600 shrink-0">Q{i + 1}.</span>
                  <h3 className="text-base font-bold text-[#0C3290] leading-snug">{item.q}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pl-7">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Maintenance */}
      <section id="care" className="py-16 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs text-amber-600 font-bold tracking-[0.2em] mb-2">MAINTENANCE</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] after:content-[''] after:block after:w-12 after:h-1 after:bg-amber-500 after:mx-auto after:mt-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              施工後のお手入れ
            </h2>
            <p className="text-base text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              コーティング本来の性能を長く引き出すための5つのコツ。
            </p>
          </div>
          <div className="space-y-3">
            {MAINTENANCE_TIPS.map(tip => (
              <div key={tip.num} className="flex gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="shrink-0 w-12 h-12 rounded-full bg-[#0C3290] text-white flex items-center justify-center text-base font-black tabular-nums" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0C3290] mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{tip.body}</p>
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
            <div className="text-xs text-amber-600 font-bold tracking-[0.2em] mb-2">FAQ</div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] after:content-[''] after:block after:w-12 after:h-1 after:bg-amber-500 after:mx-auto after:mt-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              よくある質問
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} name={`faq-${i}`} className="bg-white border border-slate-200 rounded-xl group open:border-amber-300 open:shadow-sm transition-colors">
                <summary className="cursor-pointer px-5 py-4 flex items-start gap-3 list-none">
                  <span className="text-sm font-bold text-amber-600 shrink-0">Q.</span>
                  <span className="text-base font-bold text-[#0C3290] flex-1 leading-snug">{item.q}</span>
                  <span className="text-slate-400 text-xs shrink-0 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 pl-[2.75rem]">
                  <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
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
          <p className="text-white/70 text-sm mb-8 leading-relaxed">
            気になるグレードが見つかったら、メニュー一覧から詳細をチェック。<br />
            見積もりシミュレーターで正確な料金もすぐに確認できます。
          </p>
          <div className="flex gap-3 justify-center flex-wrap items-center">
            <Link
              href={`${base}/coatings`}
              className="px-5 py-2.5 bg-transparent text-white font-bold rounded-lg text-sm border border-white/30 hover:bg-white/10 transition-colors"
            >
              メニュー一覧を見る
            </Link>
            <Link
              href={`${base}/price`}
              className="px-5 py-2.5 bg-transparent text-white font-bold rounded-lg text-sm border border-white/30 hover:bg-white/10 transition-colors"
            >
              見積もりシミュレーター
            </Link>
            <Link
              href={`${base}/booking`}
              className="px-8 py-4 bg-amber-500 text-[#0C3290] font-black rounded-lg text-base shadow-lg shadow-amber-500/30 hover:bg-amber-400 hover:shadow-amber-500/40 transition-all"
            >
              予約する →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
