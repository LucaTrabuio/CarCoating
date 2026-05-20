import Image from 'next/image';
import { KEEPER_BASE } from '@/lib/constants';

interface HeroHomeConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  cta_primary_text?: string;
  cta_primary_link?: string;
  cta_secondary_text?: string;
  cta_secondary_link?: string;
}

interface Props {
  config: HeroHomeConfig;
}

export default function HeroHomeBlock({ config }: Props) {
  const {
    title = '洗車だけで、この輝きが続く。',
    subtitle = 'KeePer PRO SHOP',
    description = '特許技術のガラスコーティングで愛車を守る。全国のKeePer認定プロショップで、あなたの車に最適なコースをご提案します。',
    cta_primary_text = '近くの店舗を探す',
    cta_primary_link = '#store-finder',
    cta_secondary_text = 'メニューを見る',
    cta_secondary_link = '#services',
  } = config;

  return (
    <section className="relative bg-[#0a0e14] min-h-[480px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0C3290]" />
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image src={`${KEEPER_BASE}/img/lineup/p_keeper_logo.png`} alt="KeePer" width={200} height={128} className="h-32 w-auto opacity-30" aria-hidden="true" />
      </div>
      <div className="relative text-center px-5 py-20">
        <div className="text-blue-600 text-sm font-semibold tracking-wider mb-4">{subtitle}</div>
        <h1 className="text-white text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {title}
        </h1>
        <p className="text-white/50 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-8">
          {description}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href={cta_primary_link} className="px-7 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors">
            {cta_primary_text}
          </a>
          <a href={cta_secondary_link} className="px-7 py-3 bg-white/10 border border-white/25 text-white font-semibold rounded-lg text-sm hover:bg-white/20 transition-colors">
            {cta_secondary_text}
          </a>
        </div>
      </div>
    </section>
  );
}
