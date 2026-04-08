import type { V3StoreData } from '@/lib/v3-types';
import type { StoreIntroConfig } from '@/lib/block-types';

interface StoreIntroBlockProps {
  config: StoreIntroConfig;
  store: V3StoreData;
}

export default function StoreIntroBlock({ config, store }: StoreIntroBlockProps) {
  const hasDescription = !!store.description;
  const hasExterior = config.show_exterior && !!store.store_exterior_url;
  const hasInterior = config.show_interior && !!store.store_interior_url;

  if (!hasDescription && !hasExterior && !hasInterior) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        <h2 className="text-[#0f1c2e] text-xl md:text-2xl font-bold text-center mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          {'\u5E97\u8217\u7D39\u4ECB'}
        </h2>
        {hasDescription && (
          <p className="text-slate-600 text-sm leading-relaxed text-center mb-8">{store.description}</p>
        )}
        {(hasExterior || hasInterior) && (
          <div className="grid md:grid-cols-2 gap-4">
            {hasExterior && (
              <div className="rounded-xl overflow-hidden">
                <img src={store.store_exterior_url} alt={`${store.store_name} \u5916\u89B3`} className="w-full h-[220px] object-cover" />
                <p className="text-xs text-slate-400 text-center mt-2">{'\u5E97\u8217\u5916\u89B3'}</p>
              </div>
            )}
            {hasInterior && (
              <div className="rounded-xl overflow-hidden">
                <img src={store.store_interior_url} alt={`${store.store_name} \u5185\u89B3`} className="w-full h-[220px] object-cover" />
                <p className="text-xs text-slate-400 text-center mt-2">{'\u5E97\u8217\u5185\u89B3'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
