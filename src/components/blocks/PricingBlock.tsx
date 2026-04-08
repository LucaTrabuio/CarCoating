import Link from 'next/link';
import type { PricingConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import { coatingTiers } from '@/data/coating-tiers';
import { getWebPrice, formatPrice } from '@/lib/pricing';
import { isBlurred } from '@/lib/blur-utils';

interface PricingBlockProps {
  config: PricingConfig;
  store: V3StoreData;
  basePath: string;
  discountRate: number;
}

function PriceBlurOverlay({ children, basePath }: { children: React.ReactNode; basePath: string }) {
  return (
    <div className="relative">
      <div style={{ filter: 'blur(6px)' }} className="select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 rounded-lg">
        <p className="text-xs text-slate-600 font-semibold mb-2 text-center px-4">
          料金の詳細はお問い合わせください
        </p>
        <Link
          href={`${basePath}/booking?mode=inquiry`}
          className="px-5 py-2 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-600 transition-colors shadow-lg"
        >
          お問い合わせ →
        </Link>
      </div>
    </div>
  );
}

export default function PricingBlock({ config, store, basePath, discountRate }: PricingBlockProps) {
  const featured = config.featured_tier_ids
    .map(id => coatingTiers.find(t => t.id === id))
    .filter(Boolean);

  // Check if ANY tier has blur enabled
  const anyBlurred = featured.some(tier => tier && isBlurred(tier.id, 'web_price', config.blur_fields));

  const pricingContent = (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      {featured.map((tier, i) => {
        if (!tier) return null;
        const webPrice = getWebPrice(tier, 'SS', discountRate);
        const blurred = isBlurred(tier.id, 'web_price', config.blur_fields);
        return (
          <div
            key={tier.id}
            className={`bg-white rounded-xl p-6 text-center border-2 ${i === 1 ? 'border-amber-500 relative' : 'border-slate-200'}`}
          >
            {i === 1 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-400 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                一番人気
              </span>
            )}
            <h3 className="font-bold text-lg text-[#0f1c2e] mb-1">{tier.name}</h3>
            <p className="text-xs text-slate-500 mb-3">
              {tier.durability_years}持続 | {tier.application_time}
            </p>
            {blurred ? (
              <div className="relative">
                <div style={{ filter: 'blur(8px)' }} className="select-none pointer-events-none text-2xl font-bold text-[#0f1c2e]" aria-hidden="true">
                  {formatPrice(webPrice)}〜
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-[#0f1c2e]">
                {formatPrice(webPrice)}〜
              </div>
            )}
            <p className="text-[10px] text-slate-400 mb-3">SSサイズ・Web割後・税込</p>
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            コーティング料金
          </h2>
          {config.show_discount_badge && (
            <p className="text-sm text-slate-400 mt-1">
              Web予約限定 最大{discountRate}%OFF
            </p>
          )}
        </div>

        {anyBlurred ? (
          <PriceBlurOverlay basePath={basePath}>
            {pricingContent}
          </PriceBlurOverlay>
        ) : (
          pricingContent
        )}

        <p className="text-center text-sm mt-4">
          <Link href={`${basePath}/coatings`} className="text-amber-600 font-semibold hover:underline">
            全8コースの詳細を見る →
          </Link>
        </p>
      </div>
    </section>
  );
}
