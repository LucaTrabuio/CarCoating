import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoreByIdAsync, getBaseUrl } from '@/lib/store-data';
import { formatPrice } from '@/lib/pricing';

interface OptionsPageProps {
  params: Promise<{ storeId: string }>;
}

const OPTION_DISCOUNT_RATE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  coating: 'コーティング系',
  window: 'ウィンドウ系',
  body: 'ボディ系',
  chemical: 'ケミカル系',
  interior: '車内系',
};

interface OptionItem {
  id: string;
  name: string;
  description: string;
  price: number;
  time: string;
  popular: boolean;
  category: string;
}

const OPTIONS: OptionItem[] = [
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

export default async function StoreOptionsPage({ params }: OptionsPageProps) {
  const { storeId } = await params;
  const baseUrl = await getBaseUrl();
  const store = await getStoreByIdAsync(storeId, baseUrl);

  if (!store) notFound();

  const categories = [...new Set(OPTIONS.map((o) => o.category))];

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1
          className="text-white text-xl font-bold"
          style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
        >
          オプションメニュー
        </h1>
        <p className="text-white/50 text-sm mt-1">{store.store_name}</p>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto">
          {/* Web discount notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-emerald-700 font-bold text-sm">
              Web予約特典: オプション全メニュー {OPTION_DISCOUNT_RATE}%OFF
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              コーティングと同時施工で適用されます
            </p>
          </div>

          {/* Options by category */}
          {categories.map((cat) => (
            <div key={cat} className="mb-8">
              <h2 className="text-base font-bold text-[#0f1c2e] mb-3 pb-2 border-b border-gray-200">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="space-y-0">
                {OPTIONS.filter((o) => o.category === cat).map((opt) => {
                  const discountedPrice = Math.round(
                    opt.price * (1 - OPTION_DISCOUNT_RATE / 100)
                  );
                  return (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between py-3 px-1 border-b border-gray-100"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[#0f1c2e]">
                          {opt.name}
                        </span>
                        {opt.popular && (
                          <span className="text-[10px] text-amber-600 font-bold ml-1">
                            ★人気
                          </span>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {opt.description} | {opt.time}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap ml-3">
                        <div className="text-[10px] text-gray-400 line-through">
                          {formatPrice(opt.price)}
                        </div>
                        <div className="text-sm font-bold text-amber-700">
                          {formatPrice(discountedPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* CTA */}
          <div className="bg-[#0f1c2e] rounded-xl p-6 text-center text-white">
            <p className="font-bold text-base mb-1">
              コーティング料金のシミュレーション
            </p>
            <p className="text-sm text-white/50 mb-4">
              車種・コースを選んで料金を確認
            </p>
            <Link
              href={`/${storeId}/price`}
              className="inline-block px-6 py-3 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              料金シミュレーターへ →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
