import type { V3StoreData } from '@/lib/v3-types';
import type { StaffPhotoConfig } from '@/lib/block-types';

interface StaffPhotoBlockProps {
  config: StaffPhotoConfig;
  store: V3StoreData;
}

export default function StaffPhotoBlock({ config, store }: StaffPhotoBlockProps) {
  if (!store.staff_photo_url) return null;

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[900px] mx-auto text-center">
        <h2 className="text-[#0C3290] text-3xl md:text-5xl font-black tracking-tight mb-6" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {'\u30B9\u30BF\u30C3\u30D5\u7D39\u4ECB'}
        </h2>
        <div className="rounded-xl overflow-hidden">
          <img
            src={store.staff_photo_url}
            alt={`${store.store_name} \u30B9\u30BF\u30C3\u30D5`}
            className="w-full max-h-[400px] object-cover"
          />
        </div>
        {config.caption && (
          <p className="text-slate-500 text-sm mt-4">{config.caption}</p>
        )}
      </div>
    </section>
  );
}
