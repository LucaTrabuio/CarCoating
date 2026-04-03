/*
 * Coatings page — tidy-up pass
 * - Added tier-level badge (Entry/Standard/Premium/Flagship)
 * - Tightened section spacing, consolidated spec tables into single block
 * - Stronger alternating backgrounds (white vs slate-50)
 * - Consistent image aspect ratios
 * - Reduced amber overload: checkmarks → emerald, recommend box → slate, stars stay amber
 * - Cleaner section dividers with left accent bar per tier
 */

import { getStoreById, getAllStoreIds, getStoreCampaign } from '@/lib/store-data';
import { notFound } from 'next/navigation';
import { coatingTiers } from '@/data/coating-tiers';
import { formatPrice } from '@/lib/pricing';
import Link from 'next/link';

const KEEPER_BASE = 'https://www.keepercoating.jp';

const tierImages: Record<string, { logo: string; cover?: string; features: { src: string; alt: string }[]; mechanism?: string; patents?: { src: string; alt: string }[] }> = {
  'ex-premium': {
    logo: '/img/lineup/coating/p_idx_ex_logo.png',
    cover: '/img/lineup/coating/exkeeper/cover.png',
    features: [
      { src: '/img/lineup/coating/exkeeper/property-1.jpg', alt: '圧倒的な撥水力' },
      { src: '/img/lineup/coating/exkeeper/property-2.jpg', alt: 'ウォータースポット防止' },
      { src: '/img/lineup/coating/exkeeper/property-3.jpg', alt: 'UV保護効果' },
    ],
    mechanism: '/img/lineup/coating/exkeeper/property-7-2.png',
  },
  'ex': {
    logo: '/img/lineup/coating/p_idx_ex_logo.png',
    cover: '/img/lineup/coating/exkeeper/excar.png',
    features: [
      { src: '/img/lineup/coating/exkeeper/property-4.jpg', alt: 'VP326厚膜コーティング' },
      { src: '/img/lineup/coating/exkeeper/property-5.jpg', alt: '深い透明感' },
      { src: '/img/lineup/coating/exkeeper/property-6.jpg', alt: 'ミネラル固着防止' },
    ],
    mechanism: '/img/lineup/coating/exkeeper/property-7-2.png',
  },
  'dia2-premium': {
    logo: '/img/lineup/coating/p_idx_dia2_logo.png',
    features: [
      { src: '/img/lineup/coating/dia2/dia2_01-mechanism.png', alt: 'ダイヤⅡの2層構造' },
      { src: '/img/lineup/coating/dia2/dia2_01-water_spot.png', alt: 'ウォータースポット防止技術' },
    ],
    mechanism: '/img/lineup/coating/dia2/dia2_01-mechanism.png',
  },
  'dia2': {
    logo: '/img/lineup/coating/p_idx_dia2_logo.png',
    features: [
      { src: '/img/lineup/coating/dia2/dia2_01-results_report.jpg', alt: '光沢試験結果' },
      { src: '/img/lineup/coating/dia2/dia2_01-water_spot.png', alt: 'ウォータースポット防止' },
    ],
    mechanism: '/img/lineup/coating/dia2/dia2_01-mechanism.png',
    patents: [
      { src: '/img/lineup/coating/dia2/dia2_01-patent.png', alt: '特許技術' },
    ],
  },
  'diamond-premium': {
    logo: '/img/lineup/coating/p_idx_diamond_logo.png',
    features: [
      { src: '/img/lineup/coating/p_idx_about01.png', alt: 'ガラスの透明感' },
      { src: '/img/lineup/coating/p_idx_about02.png', alt: '撥水性能' },
    ],
  },
  'diamond': {
    logo: '/img/lineup/coating/p_idx_diamond_logo.png',
    features: [
      { src: '/img/lineup/coating/p_idx_about03.png', alt: '深いガラスの艶' },
      { src: '/img/lineup/coating/p_idx_about04.jpg', alt: '圧倒的なコーティング膜厚' },
    ],
  },
  'fresh': {
    logo: '/img/lineup/coating/p_idx_fresh_logo.png',
    features: [
      { src: '/img/lineup/coating/fresh/befor_after_1.jpg', alt: '施工ビフォーアフター' },
      { src: '/img/lineup/coating/fresh/befor_after_2.jpg', alt: '撥水比較' },
      { src: '/img/lineup/coating/fresh/bouo-dispel.png', alt: '防汚メカニズム' },
    ],
  },
  'crystal': {
    logo: '/img/lineup/coating/p_idx_crystal_logo.png',
    cover: '/img/lineup/p_price_ckeeper02-dispel.png',
    features: [
      { src: '/img/lineup/coating/p_crystal03-dispel.png', alt: '塗装面改善の仕組み' },
    ],
    patents: [
      { src: '/img/lineup/coating/p_crystal01.png', alt: '特許：塗装面保護理論' },
      { src: '/img/lineup/coating/p_crystal02.png', alt: '特許：ウォータースポット除去' },
    ],
  },
};

const tierDetails: Record<string, { benefits: string[]; ideal_for: string; technology: string }> = {
  'ex-premium': {
    benefits: [
      '経年車のくすみや小傷を研磨で完全除去してからコーティング',
      'VP326有機ガラス被膜による圧倒的な膜厚と透明感',
      'ミネラルの固着を防止し、洗車だけで輝きが持続',
      'UV保護層が紫外線による塗装劣化を防止',
    ],
    ideal_for: '経年車を新車以上の仕上がりにしたい方、最高峰の保護力を求める方',
    technology: '研磨により塗装面の凹凸を除去した後、プライマーガラス層でダイヤモンドキーパー相当の基盤を形成。その上にVP326有機ガラス被膜を厚く施工し、最上層にUV保護膜を追加。4層構造が最高の輝きと保護力を実現します。',
  },
  'ex': {
    benefits: [
      '有機ガラス被膜VP326が圧倒的な膜厚を実現',
      'ミネラル固着を防止 — 洗車頻度を大幅削減',
      'UV保護層で紫外線による色褪せを防止',
      '3年間メンテナンスなしでも十分な保護力',
    ],
    ideal_for: '新車購入時に最高の保護をかけたい方、洗車を最小限にしたい方',
    technology: 'プライマーガラス（ダイヤモンドキーパー相当）を土台に、VP326有機ガラス被膜を厚く施工。従来のガラスコーティングでは不可能だった有機分子構造により、ミネラルの化学的固着を防止します。',
  },
  'dia2-premium': {
    benefits: [
      '研磨で経年車の小傷やくすみを除去してからのダブル被膜',
      '新開発ダイヤⅡレジンによる自浄効果',
      'ウォータースポットの形成を抑制する特許技術',
      '2年メンテナンスで最長6年の持続力',
    ],
    ideal_for: '経年車にもダイヤⅡの性能を求める方',
    technology: '細密研磨で塗装面を整えた後、高密度ガラス被膜とダイヤⅡレジンの2層構造を形成。レジン層の分子構造がファンデルワールス力を最小化し、汚れの付着を防ぎます。',
  },
  'dia2': {
    benefits: [
      'ダイヤモンドキーパーの2倍以上の光沢度',
      '雨が汚れを洗い流す自浄効果',
      'ウォータースポット防止の特許技術',
      'メンテなし3年 or 2年メンテで最長6年',
    ],
    ideal_for: '長期間の保護と美しさを両立したい方、青空駐車の方',
    technology: '高密度ガラス被膜を自然硬化で形成し、その上に新開発のダイヤⅡレジンを施工。第三者機関の光沢テストでダイヤモンドキーパーの2倍以上の明度変化を記録。分子レベルで汚れの付着を防ぐ自浄構造です。',
  },
  'diamond-premium': {
    benefits: [
      '研磨で塗装面をリフレッシュしてからコーティング',
      'ガラスとレジンのW構造で通常の約50倍の膜厚',
      '年1回メンテナンスで5年間の持続力',
      '表面の凹凸を埋めて深い艶を実現',
    ],
    ideal_for: '経年車にダイヤモンドキーパーの輝きを取り戻したい方',
    technology: '研磨で塗装面の凹凸や劣化層を除去し、高密度ガラス(II)被膜とレジン被膜のダブル構造を施工。研磨による下地処理が、新車時以上の仕上がりを可能にします。',
  },
  'diamond': {
    benefits: [
      '通常のガラスコーティングの約50倍の膜厚',
      '3年間ノーメンテナンスでも美しさをキープ',
      '年1回メンテで5年間の長期保護',
      '施工を重ねるほど塗装面が改善',
    ],
    ideal_for: '初めての本格コーティングに最適、コスパ重視の方',
    technology: '高密度ガラス(II)被膜とレジン被膜のW構造。ガラス層が塗装面の微細な凹凸を埋め、その上のレジン層が艶と撥水を担当。通常のガラスコーティングでは実現できない約50倍の膜厚により、深いガラスのような透明感を生み出します。',
  },
  'fresh': {
    benefits: [
      '圧倒的な撥水力で水だけでなくホコリも弾く',
      '雨が降ると汚れを自動的に洗い流す防汚能力',
      '青空駐車でも汚れにくい',
      'メンテナンス不要 — 年1回の再施工のみ',
    ],
    ideal_for: '青空駐車で汚れが気になる方、洗車の手間を減らしたい方',
    technology: 'フレッシュ被膜の独自レジン構造が、ファンデルワールス力（分子間引力）を最小化。通常のコーティングでは汚れが表面に吸着しますが、フレッシュキーパーは分子レベルで汚れの密着を防ぎ、雨水とともに汚れが流れ落ちます。',
  },
  'crystal': {
    benefits: [
      '年1回の施工で新車の輝きをキープ',
      '施工を重ねるほど塗装面そのものが改善',
      'ガラスのような透明感を手軽な価格で',
      '約2時間の施工で当日お引渡し',
    ],
    ideal_for: '初めてのコーティングに最適、手軽に始めたい方',
    technology: 'ガラス被膜とレジンの単層構造。毎年の再施工時に専用クリーナーが劣化した被膜を除去しますが、塗装面に化学結合したガラス粒子はそのまま残存。これにより再施工のたびに塗装面の平滑性が向上する「塗装面改善進化論」を実現します。',
  },
};

// Tier-level classification for visual badge
const tierLevel: Record<string, { label: string; color: string }> = {
  'ex-premium':     { label: 'FLAGSHIP', color: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-white' },
  'ex':             { label: 'FLAGSHIP', color: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-white' },
  'dia2-premium':   { label: 'PREMIUM',  color: 'bg-[#0f1c2e] text-amber-400' },
  'dia2':           { label: 'PREMIUM',  color: 'bg-[#0f1c2e] text-amber-400' },
  'diamond-premium':{ label: 'STANDARD', color: 'bg-slate-700 text-white' },
  'diamond':        { label: 'STANDARD', color: 'bg-slate-700 text-white' },
  'fresh':          { label: 'ENTRY+',   color: 'bg-slate-200 text-slate-700' },
  'crystal':        { label: 'ENTRY',    color: 'bg-slate-200 text-slate-700' },
};

// Accent bar color per tier level
const tierAccent: Record<string, string> = {
  'ex-premium': 'border-l-amber-500',
  'ex': 'border-l-amber-500',
  'dia2-premium': 'border-l-amber-400',
  'dia2': 'border-l-amber-400',
  'diamond-premium': 'border-l-slate-500',
  'diamond': 'border-l-slate-500',
  'fresh': 'border-l-slate-300',
  'crystal': 'border-l-slate-300',
};

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

function Stars({ rating }: { rating: number }) {
  return (
    <span className="tracking-wider">
      <span className="text-amber-500">{'★'.repeat(rating)}</span>
      <span className="text-slate-200">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default async function CoatingsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = getStoreById(storeId);
  if (!store) notFound();

  return (
    <main>
      {/* HERO */}
      <section className="bg-[#0f1c2e] py-16 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2a] via-[#14253a] to-[#0f1c2e]" />
        <div className="relative max-w-[900px] mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${KEEPER_BASE}/img/lineup/p_keeper_logo.png`} alt="KeePer" className="h-7 mx-auto mb-5 opacity-50" />
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            カーコーティングメニュー
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            全8種類のKeePer コーティングを詳しく解説。
            <br className="hidden md:block" />
            あなたの車と目的に合った最適なコースをお選びください。
          </p>
        </div>
      </section>

      {/* QUICK NAV */}
      <section className="py-4 px-5 bg-white border-b border-slate-200 sticky top-14 z-30 shadow-sm">
        <div className="max-w-[900px] mx-auto">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {coatingTiers.map(tier => (
              <a
                key={tier.id}
                href={`#${tier.id}`}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                  tier.is_popular
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tier.is_popular && '★ '}{tier.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IS COATING */}
      <section className="py-14 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-1.5" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            カーコーティングとは？
          </h2>
          <p className="text-sm text-slate-500 text-center mb-8 max-w-[560px] mx-auto leading-relaxed">
            車のボディにガラスやレジンの被膜を形成し、塗装を紫外線・酸性雨・汚れから守る施工です。化学結合による被膜は数年単位で持続します。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src: '/img/lineup/coating/p_idx_about01.png', title: '防汚・撥水' },
              { src: '/img/lineup/coating/p_idx_about02.png', title: '紫外線カット' },
              { src: '/img/lineup/coating/p_idx_about03.png', title: '艶・光沢UP' },
              { src: '/img/lineup/coating/p_idx_about04.jpg', title: '資産価値保護' },
            ].map(item => (
              <div key={item.title} className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${KEEPER_BASE}${item.src}`} alt={item.title} className="w-full aspect-[4/3] object-cover bg-slate-50" />
                <div className="px-3 py-2.5 text-center">
                  <h3 className="font-bold text-xs text-[#0f1c2e]">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIER SECTIONS */}
      {coatingTiers.map((tier, index) => {
        const images = tierImages[tier.id];
        const details = tierDetails[tier.id];
        const level = tierLevel[tier.id];
        const accent = tierAccent[tier.id];
        const isEven = index % 2 === 0;

        return (
          <section
            key={tier.id}
            id={tier.id}
            className={`py-12 px-5 ${isEven ? 'bg-slate-50/80' : 'bg-white'}`}
          >
            <div className={`max-w-[900px] mx-auto border-l-4 ${accent} pl-6`}>

              {/* Header row */}
              <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded ${level.color}`}>
                      {level.label}
                    </span>
                    {tier.is_popular && (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">人気</span>
                    )}
                    {images?.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${KEEPER_BASE}${images.logo}`} alt="" className="h-4 opacity-40 ml-1" />
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e] leading-tight" style={{ fontFamily: '"Noto Serif JP", serif' }}>
                    {tier.name}
                  </h2>
                  <p className="text-[13px] text-slate-500 mt-1">{tier.tagline}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">SSサイズ〜（税込）</div>
                  <div className="text-2xl font-bold text-[#0f1c2e]">{formatPrice(tier.prices.SS)}</div>
                </div>
              </div>

              {/* Cover + description */}
              <div className={`grid ${images?.cover ? 'md:grid-cols-[1fr_1.3fr]' : ''} gap-5 mb-6`}>
                {images?.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${KEEPER_BASE}${images.cover}`}
                    alt={`${tier.name}`}
                    className="w-full rounded-lg object-cover aspect-[4/3] bg-slate-100"
                  />
                )}
                <div>
                  <p className="text-[13px] text-slate-600 leading-relaxed mb-4">{tier.description}</p>

                  {details && (
                    <div className="space-y-1.5 mb-4">
                      {details.benefits.map((b, i) => (
                        <div key={i} className="flex gap-2 text-[13px]">
                          <span className="text-emerald-500 flex-shrink-0 mt-0.5">&#10003;</span>
                          <span className="text-slate-700">{b}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {details && (
                    <div className="bg-slate-100 rounded-lg px-4 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recommended for</p>
                      <p className="text-[13px] text-slate-700">{details.ideal_for}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feature images */}
              {images?.features && images.features.length > 0 && (
                <div className={`grid ${images.features.length === 1 ? 'grid-cols-1 max-w-[400px]' : images.features.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-2.5 mb-6`}>
                  {images.features.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`${KEEPER_BASE}${img.src}`}
                      alt={img.alt}
                      className="w-full rounded-lg object-cover aspect-[3/2] bg-slate-100 border border-slate-200"
                    />
                  ))}
                </div>
              )}

              {/* Patent badges */}
              {images?.patents && images.patents.length > 0 && (
                <div className="flex gap-2.5 items-center mb-6 py-2.5 px-3 bg-white rounded-lg border border-slate-200 w-fit">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patents</span>
                  {images.patents.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`${KEEPER_BASE}${img.src}`}
                      alt={img.alt}
                      className="h-12 w-auto object-contain"
                    />
                  ))}
                </div>
              )}

              {/* Tech explanation */}
              {details && (
                <div className={`grid ${images?.mechanism ? 'md:grid-cols-[1.2fr_1fr]' : ''} gap-4 mb-6`}>
                  <div className="bg-[#0f1c2e] rounded-lg p-5">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">Technology</p>
                    <p className="text-[13px] text-white/75 leading-relaxed">{details.technology}</p>
                  </div>
                  {images?.mechanism && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${KEEPER_BASE}${images.mechanism}`}
                      alt="被膜構造図"
                      className="w-full rounded-lg object-contain bg-white border border-slate-200 p-3"
                    />
                  )}
                </div>
              )}

              {/* Combined specs — single table */}
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

              {/* Pricing by size */}
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

              {/* CTAs */}
              <div className="flex gap-2.5">
                <Link
                  href={`/${storeId}/price`}
                  className="px-5 py-2 bg-amber-500 text-white font-bold rounded-md text-[13px] hover:bg-amber-600 transition-colors"
                >
                  見積もりシミュレーター →
                </Link>
                <Link
                  href={`/${storeId}/booking`}
                  className="px-5 py-2 bg-slate-200 text-slate-700 font-bold rounded-md text-[13px] hover:bg-slate-300 transition-colors"
                >
                  予約する
                </Link>
              </div>
            </div>
          </section>
        );
      })}

      {/* BOTTOM CTA */}
      <section className="py-14 px-5 bg-[#0f1c2e]">
        <div className="max-w-[520px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            コース選びに迷ったら
          </h2>
          <p className="text-sm text-white/40 mb-6">お車の状態やご予算に合わせて最適なコースをご提案します。</p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/${storeId}/price`}
              className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-md text-sm hover:bg-amber-600 transition-colors"
            >
              見積もりシミュレーター →
            </Link>
            <Link
              href={`/${storeId}/booking`}
              className="px-6 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20 transition-colors"
            >
              ご予約
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
