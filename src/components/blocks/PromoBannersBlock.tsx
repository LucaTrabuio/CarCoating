import ScrollFadeIn from '@/components/ScrollFadeIn';
import type { V3StoreData } from '@/lib/v3-types';

const DEFAULT_BANNERS = [
  { src: '/images/keeper-h1.jpg', alt: 'カーコーティング専門店 KeePer PRO SHOP' },
  { src: '/images/keeper-03.jpg', alt: 'ダイヤⅡキーパー 25%OFF キャンペーン' },
  { src: '/images/keeper-01.jpg', alt: '純水仕上げで最高品質' },
  { src: '/images/keeper-02.jpg', alt: 'コーティング専用ブース完備' },
];

interface PromoBannersBlockProps {
  store?: V3StoreData;
}

export default function PromoBannersBlock({ store }: PromoBannersBlockProps) {
  // Merge per-slot: use custom image if uploaded, otherwise keep default
  let custom: { src?: string; alt?: string }[] = [];
  try { custom = JSON.parse(store?.promo_banners || '[]'); } catch { /* empty */ }
  const banners = DEFAULT_BANNERS.map((def, i) =>
    custom[i]?.src ? { src: custom[i].src!, alt: custom[i].alt || def.alt } : def
  );

  return (
    <section className="py-10 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-5">
        {banners.map((banner, i) => (
          <ScrollFadeIn key={banner.src + i} delay={i * 100} direction={i % 2 === 0 ? 'left' : 'right'}>
            <div className="rounded-xl overflow-hidden shadow-md">
              <img
                src={banner.src}
                alt={banner.alt || ''}
                className="w-full h-auto object-cover"
                loading={i < 2 ? 'eager' : 'lazy'}
              />
            </div>
          </ScrollFadeIn>
        ))}
      </div>
    </section>
  );
}
