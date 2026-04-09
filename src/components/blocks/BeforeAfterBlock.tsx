import Link from 'next/link';
import type { V3StoreData } from '@/lib/v3-types';
import type { BeforeAfterConfig } from '@/lib/block-types';

interface BeforeAfterBlockProps {
  config: BeforeAfterConfig;
  store: V3StoreData;
  basePath: string;
}

export default function BeforeAfterBlock({ config, store, basePath }: BeforeAfterBlockProps) {
  if (!store.before_after_url) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto text-center">
        <h2 className="text-[#0f1c2e] text-xl md:text-2xl font-bold mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          {'\u30D3\u30D5\u30A9\u30FC\u30A2\u30D5\u30BF\u30FC'}
        </h2>
        <div className="rounded-xl overflow-hidden">
          <img
            src={store.before_after_url}
            alt={`${store.store_name} \u30D3\u30D5\u30A9\u30FC\u30A2\u30D5\u30BF\u30FC`}
            className="w-full max-h-[400px] object-cover"
          />
        </div>
        {config.show_link_to_cases && (
          <Link
            href={`${basePath}/cases`}
            className="inline-block mt-6 text-amber-500 text-sm font-semibold hover:text-amber-500 transition-colors"
          >
            {'\u65BD\u5DE5\u4E8B\u4F8B\u3092\u3082\u3063\u3068\u898B\u308B \u2192'}
          </Link>
        )}
      </div>
    </section>
  );
}
