import type { CTAConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import TrackedPhoneLink from '@/components/TrackedPhoneLink';
import TrackedLink from '@/components/TrackedLink';

interface CTABlockProps {
  config: CTAConfig;
  store: V3StoreData;
  allStores?: V3StoreData[];
}

export default function CTABlock({ config, store, allStores }: CTABlockProps) {
  const hasPhone = config.show_phone && !!store.tel;
  const hasLine = config.show_line && !!store.line_url;
  const isMultiStore = allStores && allStores.length > 1;
  const storesWithPhone = isMultiStore ? allStores.filter(s => s.tel) : [];

  if (!hasPhone && !hasLine) return null;

  return (
    <section className="py-14 px-5 bg-[#0C3290]">
      <div className="max-w-[600px] mx-auto text-center">
        <h2
          className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          お気軽にお問い合わせください
        </h2>
        {config.custom_message && (
          <p className="text-sm text-white/60 mb-6">{config.custom_message}</p>
        )}
        {!config.custom_message && (
          <p className="text-sm text-white/60 mb-6">
            ご予約・ご質問はお電話またはLINEで承ります
          </p>
        )}

        {/* Multi-store: list each store's phone */}
        {hasPhone && isMultiStore && storesWithPhone.length > 1 ? (
          <div className="space-y-3 mb-4">
            {storesWithPhone.map(s => (
              <div key={s.store_id} className="flex items-center justify-between gap-3 bg-white/10 rounded-xl px-5 py-3">
                <span className="text-white/80 text-sm font-medium truncate">{s.store_name}</span>
                <TrackedPhoneLink
                  tel={s.tel}
                  storeId={s.store_id}
                  className="text-amber-400 font-bold text-lg hover:text-amber-300 transition-colors shrink-0"
                >
                  {s.tel}
                </TrackedPhoneLink>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {hasPhone && (
              <TrackedPhoneLink
                tel={store.tel}
                storeId={store.store_id}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0C3290] font-bold rounded-xl text-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {store.tel}
              </TrackedPhoneLink>
            )}
          </div>
        )}

        {hasLine && (
          <div className={`flex justify-center ${hasPhone ? 'mt-4' : ''}`}>
            <TrackedLink
              href={store.line_url!}
              storeId={store.store_id}
              event="line_click"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#06C755] text-white font-bold rounded-xl text-lg hover:bg-[#05b34c] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINEで相談
            </TrackedLink>
          </div>
        )}
      </div>
    </section>
  );
}
