'use client';

import { useState, useEffect } from 'react';
import type { V3StoreData } from '@/lib/v3-types';
import type { HeroConfig } from '@/lib/block-types';
import TrustBadges from '@/components/TrustBadges';
import TrackedLink from '@/components/TrackedLink';

interface HeroBlockProps {
  config: HeroConfig;
  store: V3StoreData;
  basePath: string;
}

export default function HeroBlock({ config, store, basePath }: HeroBlockProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<'initial' | 'zoom' | 'text' | 'reblur'>('initial');

  useEffect(() => {
    setMounted(true);
    const t0 = setTimeout(() => setPhase('zoom'), 200);
    const t1 = setTimeout(() => setPhase('text'), 2200);
    const t2 = setTimeout(() => setPhase('reblur'), 3000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const imgSrc = config.image_url || store.hero_image_url || '/images/dia2-hero.jpg';

  const showText = phase === 'text' || phase === 'reblur';
  const isReblurred = phase === 'reblur';

  return (
    <section suppressHydrationWarning className="relative min-h-[600px] md:min-h-[800px] flex items-center justify-center" style={{ clipPath: 'inset(0)' }}>
      {mounted ? (
        <img
          src={imgSrc}
          alt={store.store_name}
          className="fixed inset-0 w-full h-full object-cover"
          style={{
            transform: phase === 'initial' ? 'scale(1.15)' : 'scale(1)',
            filter: isReblurred ? 'blur(6px) brightness(0.55)' : 'blur(0px) brightness(1)',
            transition: phase === 'initial'
              ? undefined
              : 'transform 3s ease-out, filter 0.8s ease-in-out',
          }}
        />
      ) : (
        <img
          src={imgSrc}
          alt={store.store_name}
          className="fixed inset-0 w-full h-full object-cover"
          style={{ transform: 'scale(1.15)' }}
        />
      )}
      <div className="absolute inset-0" />
      {mounted ? (
        <div
          className="relative w-full p-8"
          style={{
            opacity: showText ? 1 : 0,
            transform: showText ? 'translateY(0px)' : 'translateY(20px)',
            transition: 'opacity 1s ease-out, transform 1s ease-out',
          }}
        >
          <div className="max-w-[900px] mx-auto text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight mb-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              {config.title || store.hero_title || '洗車だけで、この輝きが続く。'}
            </h1>
            <p className="text-white/60 text-sm mb-4">{config.subtitle || store.hero_subtitle || `${store.store_name} ｜ KeePer PRO SHOP認定`}</p>
            {config.show_badges && <TrustBadges hasBooth={store.has_booth} level1Count={store.level1_staff_count} level2Count={store.level2_staff_count} />}
            <div className="flex gap-3 justify-center mt-5">
              {config.show_cta_booking && <TrackedLink href={`${basePath}/booking`} storeId={store.store_id} event="cta_booking" className="px-7 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors shadow-lg">{'\u4E88\u7D04\u3059\u308B'}</TrackedLink>}
              {config.show_cta_inquiry && <TrackedLink href={`${basePath}/booking?mode=inquiry`} storeId={store.store_id} event="cta_inquiry" className="px-7 py-3 bg-white border border-white text-[#0C3290] font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors shadow-lg">{'\u304A\u554F\u3044\u5408\u308F\u305B'}</TrackedLink>}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full p-8" style={{ opacity: 0 }}>
          <div className="max-w-[900px] mx-auto text-center">
            <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight mb-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              {config.title || store.hero_title || '洗車だけで、この輝きが続く。'}
            </h1>
            <p className="text-white/60 text-sm mb-4">{config.subtitle || store.hero_subtitle || `${store.store_name} ｜ KeePer PRO SHOP認定`}</p>
            {config.show_badges && <TrustBadges hasBooth={store.has_booth} level1Count={store.level1_staff_count} level2Count={store.level2_staff_count} />}
            <div className="flex gap-3 justify-center mt-5">
              {config.show_cta_booking && <TrackedLink href={`${basePath}/booking`} storeId={store.store_id} event="cta_booking" className="px-7 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors shadow-lg">{'\u4E88\u7D04\u3059\u308B'}</TrackedLink>}
              {config.show_cta_inquiry && <TrackedLink href={`${basePath}/booking?mode=inquiry`} storeId={store.store_id} event="cta_inquiry" className="px-7 py-3 bg-white border border-white text-[#0C3290] font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors shadow-lg">{'\u304A\u554F\u3044\u5408\u308F\u305B'}</TrackedLink>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
