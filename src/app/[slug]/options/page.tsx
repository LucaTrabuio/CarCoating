import { notFound } from 'next/navigation';
import { getV3StoreById, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { formatPrice } from '@/lib/pricing';
import { getBlurFieldsFromLayout } from '@/lib/blur-utils';
import { parsePageLayout } from '@/lib/block-types';
import type { PricingConfig } from '@/lib/block-types';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  coating: 'コーティング系',
  window: 'ウィンドウ系',
  body: 'ボディ系',
  chemical: 'ケミカル系',
  interior: '車内系',
};

const DEFAULT_OPTIONS = [
  { id: 'window-full', name: '超撥水ウィンドウコーティング（全面）', description: '雨の日の視界を良好に', price: 8270, time: '15分', popular: true, category: 'window' },
  { id: 'wheel-single', name: 'ホイールコーティング（シングル）', description: 'ガラス被膜でホイールを保護', price: 10700, time: '30分', popular: true, category: 'coating' },
  { id: 'lens', name: 'レンズコーティング', description: '専用ガラス被膜でライトレンズを保護', price: 6810, time: '30分', popular: true, category: 'coating' },
  { id: 'headlight', name: 'ヘッドライトクリーン＆コーティング', description: '黄ばみ・くすみを除去しコーティング', price: 11630, time: '45分', popular: false, category: 'coating' },
  { id: 'wheel-double', name: 'ホイールコーティング（ダブル）', description: 'より艶と水弾きを長期間キープ', price: 15900, time: '90分', popular: false, category: 'coating' },
  { id: 'fender', name: '樹脂フェンダーキーパー', description: '無塗装樹脂パーツの色褪せを防止', price: 6280, time: '30分', popular: false, category: 'coating' },
  { id: 'window-front', name: '超撥水ウィンドウコーティング（フロント）', description: 'フロントガラスのみ施工', price: 3720, time: '15分', popular: false, category: 'window' },
  { id: 'window-scale', name: 'ウィンドウウロコ取り（サイド）', description: '窓ガラスの水垢・ウロコを除去', price: 6480, time: '10分/枚', popular: false, category: 'window' },
  { id: 'window-scale-full', name: 'ウィンドウウロコ取り（全面）', description: 'フロント・リア・ルーフ含む全面', price: 12970, time: '10分/枚', popular: false, category: 'window' },
  { id: 'polish', name: '細密研磨', description: '塗装表面のキズのエッジを細密に磨き取る', price: 18600, time: '60分', popular: false, category: 'body' },
  { id: 'oil-film-full', name: '油膜取り（全面）', description: 'ギラギラの油膜を特殊ケミカルで除去', price: 4750, time: '15分', popular: false, category: 'chemical' },
  { id: 'oil-film-front', name: '油膜取り（フロント）', description: 'フロントガラスのみ', price: 1690, time: '10分', popular: false, category: 'chemical' },
  { id: 'iron', name: '鉄粉取り（上面）', description: 'ボディのザラザラ鉄粉をすっきり除去', price: 2830, time: '15分', popular: false, category: 'chemical' },
  { id: 'sap', name: '樹液取り', description: '松ヤニ等を専用ケミカルで安全に除去', price: 2750, time: '15分', popular: false, category: 'chemical' },
  { id: 'wheel-clean', name: 'ホイールクリーニング', description: 'ブレーキダスト・油汚れを専用道具で除去', price: 2270, time: '10分', popular: false, category: 'chemical' },
  { id: 'disinfect', name: '車内除菌抗菌「オールクリア」', description: '車内清掃＋除菌・抗菌処理', price: 4650, time: '30分', popular: false, category: 'interior' },
];

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

export default async function V3OptionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store || !store.is_active) notFound();

  const base = `/${storeId}`;
  const blurFields = getBlurFieldsFromLayout(store.page_layout);

  // Resolve option discount from pricing block config
  const defaults = await getV3CampaignDefaults();
  const storeDiscount = store.discount_rate || defaults.discount;
  const layout = parsePageLayout(store.page_layout, store);
  const pricingBlock = layout.blocks.find(b => b.type === 'pricing');
  const pricingConfig = pricingBlock?.config as PricingConfig | undefined;
  const syncWithStore = pricingConfig?.option_discount_sync ?? true;
  // When synced: discount is applied to prices but banner is hidden (already shown on main pricing pages)
  // When custom: show banner with custom rate
  const optionDiscount = syncWithStore ? storeDiscount : (pricingConfig?.option_discount_rate ?? 10);
  const showOptionBanner = !syncWithStore && optionDiscount > 0;
  // If store-level pricing blur is on (all:web_price), blur all option prices too
  const globalPriceBlur = blurFields.includes('all:web_price') || blurFields.includes('web_price');

  // Use custom options from Firebase if available, otherwise defaults
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
      <section className="bg-[#0f1c2e] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>オプションメニュー</h1>
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
                      <span className="text-sm font-semibold text-[#0f1c2e]">
                        {opt.name}
                        {opt.popular && <span className="text-[10px] text-amber-500 font-bold ml-1">★人気</span>}
                      </span>
                      <div className="text-[11px] text-gray-400">{opt.description}{opt.time ? ` ｜ ${opt.time}` : ''}</div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      {(opt.blur_price || globalPriceBlur) ? (
                        <div className="relative">
                          <div style={{ filter: 'blur(6px)' }} className="select-none pointer-events-none" aria-hidden="true">
                            {optionDiscount > 0 && <div className="text-[10px] text-gray-400 line-through">{formatPrice(opt.price)}</div>}
                            <div className="text-sm font-semibold text-amber-700">{formatPrice(optionDiscount > 0 ? Math.round(opt.price * (1 - optionDiscount / 100)) : opt.price)}</div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] text-slate-500 font-semibold bg-white/80 px-1.5 py-0.5 rounded">要問合せ</span>
                          </div>
                        </div>
                      ) : optionDiscount > 0 ? (
                        <>
                          <div className="text-[10px] text-gray-400 line-through">{formatPrice(opt.price)}</div>
                          <div className="text-sm font-semibold text-amber-700">{formatPrice(Math.round(opt.price * (1 - optionDiscount / 100)))}</div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-[#0f1c2e]">{formatPrice(opt.price)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8 text-center">
            <Link href={`${base}/price`}
              className="inline-block px-8 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors">
              見積もりシミュレーターへ →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
