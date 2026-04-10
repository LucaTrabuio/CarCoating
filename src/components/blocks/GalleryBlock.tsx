import type { V3StoreData } from '@/lib/v3-types';
import type { GalleryConfig } from '@/lib/block-types';

interface GalleryBlockProps {
  config: GalleryConfig;
  store: V3StoreData;
}

export default function GalleryBlock({ config, store }: GalleryBlockProps) {
  let images: string[] = [];
  try {
    images = JSON.parse(store.gallery_images || '[]');
  } catch {
    images = [];
  }

  if (images.length === 0) return null;

  const displayImages = images.slice(0, config.max_images);

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-[#0C3290] text-3xl md:text-5xl font-black tracking-tight text-center mb-8" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {'\u30D5\u30A9\u30C8\u30AE\u30E3\u30E9\u30EA\u30FC'}
        </h2>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${config.columns_mobile}, 1fr)`,
          }}
        >
          {displayImages.map((url, i) => (
            <div key={i} className="rounded-lg overflow-hidden aspect-square">
              <img
                src={url}
                alt={`\u30AE\u30E3\u30E9\u30EA\u30FC ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <style>{`
          @media (min-width: 768px) {
            .gallery-grid { grid-template-columns: repeat(${config.columns_desktop}, 1fr) !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
