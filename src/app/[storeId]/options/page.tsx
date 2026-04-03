import { getStoreByIdAsync, getBaseUrl, getAllStoreIds } from '@/lib/store-data';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/pricing';
import Link from 'next/link';

export async function generateStaticParams() {
  return getAllStoreIds().map(id => ({ storeId: id }));
}

export async function generateMetadata({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = await getStoreByIdAsync(storeId, await getBaseUrl());
  if (!store) return {};
  return {
    title: `オプションメニュー｜${store.store_name}｜KeePer PRO SHOP`,
    description: `${store.store_name}のオプションメニュー一覧。ウィンドウコーティング、ホイール、レンズ、研磨、除菌など全16種。`,
  };
}

const OPTION_DISCOUNT = 10;

interface Option {
  name: string;
  description: string;
  price: number | string;
  priceNote?: string;
  time: string;
  popular?: boolean;
}

const categories: { title: string; description: string; options: Option[] }[] = [
  {
    title: 'コーティング系',
    description: 'ボディ以外のパーツをガラス被膜で保護',
    options: [
      { name: 'ホイールコーティング（シングル）', description: 'ガラス被膜でホイールをブレーキダスト・汚れから保護', price: 10700, priceNote: '〜15インチ', time: '30分', popular: true },
      { name: 'ホイールコーティング（ダブル）', description: '2層のガラス被膜でより長期間の艶と撥水をキープ', price: 15900, priceNote: '〜15インチ', time: '90分' },
      { name: 'レンズコーティング', description: 'ヘッドライト・テールライトを専用ガラス被膜で保護', price: 6810, priceNote: '軽自動車', time: '30分', popular: true },
      { name: 'ヘッドライトクリーン＆コーティング', description: '黄ばみ・くすみを除去してからガラス被膜でコーティング', price: 11630, priceNote: '両側', time: '45分' },
      { name: '樹脂フェンダーキーパー', description: '無塗装樹脂パーツの色褪せを防止し汚れから守る', price: 6280, priceNote: '〜', time: '30分' },
    ],
  },
  {
    title: 'ウィンドウ系',
    description: '視界の安全性と美観を向上',
    options: [
      { name: '超撥水ウィンドウコーティング（全面）', description: '全てのガラスに施工。雨の日の視界を大幅に改善', price: 8270, priceNote: 'SS/S/M', time: '15分', popular: true },
      { name: '超撥水ウィンドウコーティング（フロント）', description: 'フロントガラスのみ施工', price: 3720, priceNote: 'SS/S/M', time: '15分' },
      { name: 'ウィンドウウロコ取り（サイド）', description: '窓ガラスに付着した水垢・ウロコを専用ケミカルで除去', price: 6480, time: '10分/枚' },
      { name: 'ウィンドウウロコ取り（全面）', description: 'フロント・リア・ルーフ含む全てのガラス', price: 12970, time: '10分/枚' },
    ],
  },
  {
    title: 'ボディ補修系',
    description: '塗装面のコンディションを改善',
    options: [
      { name: '細密研磨', description: '塗装表面のキズのエッジ部分だけを細密に磨き取る。コーティング前の下地処理に最適', price: 18600, priceNote: 'SSサイズ', time: '60分' },
    ],
  },
  {
    title: 'ケミカル処理系',
    description: '付着物の除去・クリーニング',
    options: [
      { name: '油膜取り（全面）', description: 'ギラギラの油膜を特殊ケミカルでスッキリ除去', price: 4750, priceNote: 'SS/S/M', time: '15分' },
      { name: '油膜取り（フロント）', description: 'フロントガラスのみ', price: 1690, priceNote: 'SS/S/M', time: '10分' },
      { name: '鉄粉取り（上面）', description: 'ボディに付着したザラザラの鉄粉をすっきり除去', price: 2830, priceNote: 'SSサイズ', time: '15分' },
      { name: '樹液取り', description: '松ヤニ等の樹液を技術者が専用ケミカルで安全に除去', price: 2750, priceNote: 'SSサイズ', time: '15分' },
      { name: 'ホイールクリーニング', description: '洗車では落ちないブレーキダスト・油汚れを専用道具で除去', price: 2270, priceNote: '全車共通', time: '10分' },
    ],
  },
  {
    title: '車内系',
    description: '車内の衛生・快適性を向上',
    options: [
      { name: '車内除菌抗菌「オールクリア」', description: '車内清掃に加えて除菌・抗菌処理で仕上げ。ハンドル・ドアノブ等の高接触部を重点的に', price: 4650, priceNote: 'SSサイズ', time: '30分' },
    ],
  },
  {
    title: 'お見積もり対応',
    description: '状態に応じてお見積もり',
    options: [
      { name: 'ウォータースポット除去', description: '雨ジミ・イオンデポジットを専用ケミカルで除去', price: '要見積もり', time: '応相談' },
      { name: 'エンジンルームクリーン＆プロテクト', description: 'エンジンルーム内の清掃と保護コーティング', price: '要見積もり', time: '応相談' },
      { name: '塗装ダメージ補修', description: '飛び石、擦り傷等の塗装ダメージを補修', price: '要見積もり', time: '応相談' },
    ],
  },
];

export default async function OptionsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = await getStoreByIdAsync(storeId, await getBaseUrl());
  if (!store) notFound();

  return (
    <main>
      <section className="bg-[#0f1c2e] py-14 px-5 text-center">
        <div className="max-w-[800px] mx-auto">
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            オプションメニュー
          </h1>
          <p className="text-white/40 text-sm">
            コーティングと一緒にご注文いただけるオプションサービス全{categories.reduce((s, c) => s + c.options.length, 0)}種。
          </p>
          <p className="text-emerald-400 text-sm font-semibold mt-2">Web予約特典: オプション全メニュー{OPTION_DISCOUNT}%OFF</p>
        </div>
      </section>

      {categories.map((cat, ci) => (
        <section key={cat.title} className={`py-10 px-5 ${ci % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-lg font-bold text-[#0f1c2e] mb-1" style={{ fontFamily: '"Noto Serif JP", serif' }}>{cat.title}</h2>
            <p className="text-xs text-slate-400 mb-5">{cat.description}</p>

            <div className="space-y-3">
              {cat.options.map(opt => {
                const hasNumericPrice = typeof opt.price === 'number';
                const discounted = hasNumericPrice ? Math.round((opt.price as number) * (1 - OPTION_DISCOUNT / 100)) : null;

                return (
                  <div key={opt.name} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm text-[#0f1c2e]">{opt.name}</h3>
                        {opt.popular && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">人気</span>}
                      </div>
                      <p className="text-xs text-slate-500">{opt.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">施工時間: {opt.time}{opt.priceNote ? ` ｜ ${opt.priceNote}〜` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hasNumericPrice ? (
                        <>
                          <div className="text-[11px] text-slate-400 line-through">{formatPrice(opt.price as number)}</div>
                          <div className="text-lg font-bold text-amber-700">{formatPrice(discounted!)}</div>
                          <div className="text-[10px] text-emerald-600 font-semibold">{OPTION_DISCOUNT}%OFF</div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold text-slate-500">{opt.price}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* NOTES */}
      <section className="py-8 px-5 bg-slate-100">
        <div className="max-w-[800px] mx-auto text-xs text-slate-500 space-y-1">
          <p>※ 表示価格は税込です。車種サイズにより料金が異なる場合があります。</p>
          <p>※ Web予約特典の{OPTION_DISCOUNT}%OFFはガラスコーティングと同時施工の場合に適用されます。</p>
          <p>※ 「要見積もり」のメニューはお車の状態を確認した上でお見積もりいたします。</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-5 bg-[#0f1c2e]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            コーティングと一緒にお見積もり
          </h2>
          <p className="text-sm text-white/40 mb-6">見積もりシミュレーターでオプションの合計額をリアルタイム計算できます。</p>
          <Link href={`/${storeId}/price`} className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-md text-sm hover:bg-amber-600 transition-colors">
            見積もりシミュレーター →
          </Link>
        </div>
      </section>
    </main>
  );
}
