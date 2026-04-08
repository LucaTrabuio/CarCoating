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
  return (
    <section className="relative bg-[#0a0e14] min-h-[400px] flex items-center justify-center overflow-hidden">
      {(config.image_url || store.hero_image_url) ? (
        <img src={config.image_url || store.hero_image_url} alt={store.store_name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f1c2e]" />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-8 pb-8">
        <div className="max-w-[900px] mx-auto text-center">
          <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            {config.title || store.hero_title || '\u6D17\u8ECA\u3060\u3051\u3067\u3001\u3053\u306E\u8F1D\u304D\u304C\u7D9A\u304F\u3002'}
          </h1>
          <p className="text-white/60 text-sm mb-4">{config.subtitle || store.hero_subtitle || `${store.store_name} \uFF5C KeePer PRO SHOP\u8A8D\u5B9A`}</p>
          {config.show_badges && <TrustBadges hasBooth={store.has_booth} level1Count={store.level1_staff_count} level2Count={store.level2_staff_count} />}
          <div className="flex gap-3 justify-center mt-5">
            {config.show_cta_booking && <TrackedLink href={`${basePath}/booking`} storeId={store.store_id} event="cta_booking" className="px-7 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors">{'\u4E88\u7D04\u3059\u308B'}</TrackedLink>}
            {config.show_cta_inquiry && <TrackedLink href={`${basePath}/booking?mode=inquiry`} storeId={store.store_id} event="cta_inquiry" className="px-7 py-3 bg-white/10 border border-white/25 text-white font-semibold rounded-lg text-sm hover:bg-white/20 transition-colors">{'\u304A\u554F\u3044\u5408\u308F\u305B'}</TrackedLink>}
          </div>
        </div>
      </div>
    </section>
  );
}
