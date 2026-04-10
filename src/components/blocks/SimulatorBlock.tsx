import type { V3StoreData } from '@/lib/v3-types';
import HomeSimulatorLink from '@/components/HomeSimulatorLink';

interface SimulatorBlockProps {
  store: V3StoreData;
  basePath: string;
}

export default function SimulatorBlock({ store, basePath }: SimulatorBlockProps) {
  return (
    <section className="py-14 px-5 bg-[#0C3290]">
      <div className="max-w-[1100px] mx-auto text-center">
        <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight mb-2" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {'\u304B\u3093\u305F\u3093\u898B\u7A4D\u3082\u308A'}
        </h2>
        <p className="text-white/50 text-sm mb-6">{'\u8ECA\u7A2E\u3092\u9078\u3076\u3060\u3051\u3067\u6599\u91D1\u304C\u308F\u304B\u308A\u307E\u3059'}</p>
        <HomeSimulatorLink storeId={store.store_id} basePath={basePath} />
      </div>
    </section>
  );
}
