import Link from 'next/link';
import type { PricingConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import TrackedLink from '@/components/TrackedLink';
import { coatingTiers } from '@/data/coating-tiers';
import { getWebPrice, formatPrice } from '@/lib/pricing';
import { isBlurred } from '@/lib/blur-utils';

interface PricingBlockProps {
  config: PricingConfig;
  store: V3StoreData;
  basePath: string;
  discountRate: number;
}

function PriceBlurOverlay({ children, basePath, storeId, tierId }: { children: React.ReactNode; basePath: string; storeId: string; tierId?: string }) {
  const inquiryUrl = tierId ? `${basePath}/inquiry?tier=${tierId}` : `${basePath}/inquiry`;
  return (
    <div className="relative pt-6">
      {/* Card content underneath (clear) */}
      {children}
      {/* Single backdrop-blur overlay: transparent at top (near ichiban ninki), full blur at bottom */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
        style={{
          backdropFilter: 'blur(7px)',
          WebkitBackdropFilter: 'blur(7px)',
          maskImage: 'linear-gradient(to bottom, transparent 15%, black 60%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 15%, black 60%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
        style={{ transform: 'translateY(90px)' }}
      >
        <p className="text-xs text-slate-600 font-semibold mb-3 text-center px-4">
          料金はお問い合わせ後にメールでご案内
        </p>
        <TrackedLink
          href={inquiryUrl}
          storeId={storeId}
          event="cta_inquiry"
          meta={{ source: 'pricing_blur', tier: tierId || '' }}
          className="px-5 py-2 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-xs hover:bg-amber-500 transition-colors pointer-events-auto shadow-sm"
        >
          料金を問い合わせる →
        </TrackedLink>
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
    <div
      className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 pt-4"
      style={anyBlurred ? {
        maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      } : undefined}
    >
      {featured.map((tier, i) => {
        if (!tier) return null;
        const webPrice = getWebPrice(tier, 'SS', discountRate);
        const blurred = isBlurred(tier.id, 'web_price', config.blur_fields);
        return (
          <div
            key={tier.id}
            className={`bg-white rounded-xl text-center border-2 min-w-0 ${i === 1 ? 'border-amber-500 relative' : 'border-slate-200'}`}
            style={{ padding: 'clamp(0.5rem, 1.5vw, 1.5rem)' }}
          >
            {i === 1 && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-[#0C3290] font-bold px-2 sm:px-3 py-0.5 rounded-full whitespace-nowrap"
                style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.75rem)' }}
              >
                一番人気
              </span>
            )}
            <h3
              className="font-bold text-[#0C3290] mb-1 leading-tight"
              style={{ fontSize: 'clamp(0.65rem, 1.8vw, 1.125rem)' }}
            >
              {tier.name}
            </h3>
            <p
              className="text-slate-500 leading-tight mb-2"
              style={{ fontSize: 'clamp(0.5rem, 1.1vw, 0.75rem)' }}
            >
              {tier.durability_years}持続 | {tier.application_time}
            </p>
            <div
              className="font-bold text-[#0C3290] select-none leading-tight"
              style={{ fontSize: 'clamp(0.85rem, 2.6vw, 1.5rem)' }}
            >
              {formatPrice(webPrice)}〜
            </div>
            <p
              className="text-slate-400 leading-tight mb-2"
              style={{ fontSize: 'clamp(0.45rem, 1vw, 0.625rem)' }}
            >
              {blurred ? 'お問い合わせ後にメールでご案内' : `SSサイズ${discountRate > 0 ? '・Web割後' : ''}・税込`}
            </p>
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      className="py-14 px-5 relative"
      style={anyBlurred ? {
        background: 'linear-gradient(to bottom, #ffffff 0%, #ffffff 30%, rgba(235,235,238,1) 70%, rgba(220,220,225,1) 100%)',
      } : { background: '#ffffff' }}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
            コーティング料金
          </h2>
          {config.show_discount_badge && discountRate > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Web予約限定 最大{discountRate}%OFF
            </p>
          )}
        </div>

        {anyBlurred ? (
          <PriceBlurOverlay basePath={basePath} storeId={store.store_id}>
            {pricingContent}
          </PriceBlurOverlay>
        ) : (
          pricingContent
        )}

        <div className="text-right mt-24">
          <Link href={`${basePath}/coatings`} className="inline-block bg-amber-500 text-[#0C3290] px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
            全8コースの詳細を見る →
          </Link>
        </div>
      </div>
    </section>
  );
}
