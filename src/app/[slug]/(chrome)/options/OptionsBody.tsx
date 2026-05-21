import Link from 'next/link';
import { formatPrice, applyDiscount } from '@/lib/pricing';
import { parsePageLayout } from '@/lib/block-types';
import type { PricingConfig } from '@/lib/block-types';
import { DEFAULT_SERVICE_OPTIONS, CATEGORY_LABELS, type ServiceOption as DefaultServiceOption } from '@/data/service-options';
import type { V3StoreData } from '@/lib/v3-types';

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  time?: string;
  popular?: boolean;
  category?: string;
  blur_price?: boolean;
}

const DEFAULT_OPTIONS: DefaultServiceOption[] = DEFAULT_SERVICE_OPTIONS;

interface OptionsBodyProps {
  store: V3StoreData;
  basePath: string;
  optionDiscount: number;
  showOptionBanner: boolean;
  globalPriceBlur: boolean;
}

export function OptionsBody({ store, basePath, optionDiscount, showOptionBanner, globalPriceBlur }: OptionsBodyProps) {
  let options: ServiceOption[] = DEFAULT_OPTIONS;
  try {
    const parsed = JSON.parse(store.custom_services || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      options = parsed;
    }
  } catch { /* use defaults */ }

  const categories = [...new Set(options.map(o => o.category || 'other'))];

  return (
    <main>
      <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>オプションメニュー</h1>
        {showOptionBanner && (
          <p className="text-white/40 text-sm mt-1">コーティングと同時施工で{optionDiscount}%OFF</p>
        )}
      </section>

      {showOptionBanner && (
        <section className="py-3 px-5 bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-[800px] mx-auto text-center text-emerald-700 text-sm font-semibold">
            Web予約特典: オプション全メニュー{optionDiscount}%OFF適用中
          </div>
        </section>
      )}

      <section className="py-10 px-5">
        <div className="max-w-[800px] mx-auto">
          {categories.map(cat => (
            <div key={cat} className="mb-8">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1 py-2 bg-slate-50 rounded mb-2">
                {CATEGORY_LABELS[cat] || cat}
              </h2>
              <div className="space-y-0">
                {options.filter(o => (o.category || 'other') === cat).map(opt => (
                  <div key={opt.id} className="flex items-center justify-between py-3 px-2 border-b border-gray-100">
                    <div>
                      <span className="text-sm font-semibold text-[#0C3290]">
                        {opt.name}
                        {opt.popular && <span className="text-[10px] text-amber-700 font-bold ml-1.5 px-1.5 py-0.5 bg-amber-50 rounded">人気</span>}
                      </span>
                      <div className="text-[11px] text-gray-400">{opt.description}{opt.time ? ` ｜ ${opt.time}` : ''}</div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      {(opt.blur_price || globalPriceBlur) ? (
                        <div className="relative">
                          <div style={{ filter: 'blur(6px)' }} className="select-none pointer-events-none" aria-hidden="true">
                            {optionDiscount > 0 && <div className="text-[10px] text-gray-400 line-through">{formatPrice(opt.price)}</div>}
                            <div className="text-sm font-semibold text-amber-700">{formatPrice(optionDiscount > 0 ? applyDiscount(opt.price, optionDiscount) : opt.price)}</div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] text-slate-500 font-semibold bg-white/80 px-1.5 py-0.5 rounded">要問合せ</span>
                          </div>
                        </div>
                      ) : optionDiscount > 0 ? (
                        <>
                          <div className="text-[10px] text-gray-400 line-through">{formatPrice(opt.price)}</div>
                          <div className="text-sm font-semibold text-amber-700">{formatPrice(applyDiscount(opt.price, optionDiscount))}</div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-[#0C3290]">{formatPrice(opt.price)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8 text-center">
            <Link href={`${basePath}/price`}
              className="inline-block px-8 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors">
              見積もりシミュレーターへ →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function resolveOptionsConfig(store: V3StoreData, storeDiscount: number) {
  const layout = parsePageLayout(store.page_layout, store);
  const pricingBlock = layout.blocks.find(b => b.type === 'pricing');
  const pricingConfig = pricingBlock?.config as PricingConfig | undefined;
  const syncWithStore = pricingConfig?.option_discount_sync ?? true;
  const optionDiscount = syncWithStore ? storeDiscount : (pricingConfig?.option_discount_rate ?? 10);
  const showOptionBanner = !syncWithStore && optionDiscount > 0;
  const globalPriceBlur = pricingConfig?.option_blur_prices ?? false;
  return { optionDiscount, showOptionBanner, globalPriceBlur };
}
