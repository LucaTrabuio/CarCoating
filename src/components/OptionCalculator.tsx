'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/pricing';

interface OptionItem {
  id: string;
  name: string;
  description: string;
  price: number;
  time: string;
  popular: boolean;
  category: 'coating' | 'window' | 'body' | 'chemical' | 'interior';
}

const CATEGORY_LABELS: Record<string, string> = {
  coating: 'コーティング系',
  window: 'ウィンドウ系',
  body: 'ボディ系',
  chemical: 'ケミカル系',
  interior: '車内系',
};

const OPTIONS: OptionItem[] = [
  // Coating
  { id: 'window-full', name: '超撥水ウィンドウコーティング（全面）', description: '雨の日の視界を良好に', price: 8270, time: '15分', popular: true, category: 'window' },
  { id: 'wheel-single', name: 'ホイールコーティング（シングル）', description: 'ガラス被膜でホイールを保護', price: 10700, time: '30分', popular: true, category: 'coating' },
  { id: 'lens', name: 'レンズコーティング', description: '専用ガラス被膜でライトレンズを保護', price: 6810, time: '30分', popular: true, category: 'coating' },
  { id: 'headlight', name: 'ヘッドライトクリーン＆コーティング', description: '黄ばみ・くすみを除去しコーティング', price: 11630, time: '45分', popular: false, category: 'coating' },
  { id: 'wheel-double', name: 'ホイールコーティング（ダブル）', description: 'より艶と水弾きを長期間キープ', price: 15900, time: '90分', popular: false, category: 'coating' },
  { id: 'fender', name: '樹脂フェンダーキーパー', description: '無塗装樹脂パーツの色褪せを防止', price: 6280, time: '30分', popular: false, category: 'coating' },
  // Window
  { id: 'window-front', name: '超撥水ウィンドウコーティング（フロント）', description: 'フロントガラスのみ施工', price: 3720, time: '15分', popular: false, category: 'window' },
  { id: 'window-scale', name: 'ウィンドウウロコ取り（サイド）', description: '窓ガラスの水垢・ウロコを除去', price: 6480, time: '10分/枚', popular: false, category: 'window' },
  { id: 'window-scale-full', name: 'ウィンドウウロコ取り（全面）', description: 'フロント・リア・ルーフ含む全面', price: 12970, time: '10分/枚', popular: false, category: 'window' },
  // Body
  { id: 'polish', name: '細密研磨', description: '塗装表面のキズのエッジを細密に磨き取る', price: 18600, time: '60分', popular: false, category: 'body' },
  // Chemical
  { id: 'oil-film-full', name: '油膜取り（全面）', description: 'ギラギラの油膜を特殊ケミカルで除去', price: 4750, time: '15分', popular: false, category: 'chemical' },
  { id: 'oil-film-front', name: '油膜取り（フロント）', description: 'フロントガラスのみ', price: 1690, time: '10分', popular: false, category: 'chemical' },
  { id: 'iron', name: '鉄粉取り（上面）', description: 'ボディのザラザラ鉄粉をすっきり除去', price: 2830, time: '15分', popular: false, category: 'chemical' },
  { id: 'sap', name: '樹液取り', description: '松ヤニ等を専用ケミカルで安全に除去', price: 2750, time: '15分', popular: false, category: 'chemical' },
  { id: 'wheel-clean', name: 'ホイールクリーニング', description: 'ブレーキダスト・油汚れを専用道具で除去', price: 2270, time: '10分', popular: false, category: 'chemical' },
  // Interior
  { id: 'disinfect', name: '車内除菌抗菌「オールクリア」', description: '車内清掃＋除菌・抗菌処理', price: 4650, time: '30分', popular: false, category: 'interior' },
];

interface OptionCalculatorProps {
  basePlanPrice: number;
  basePlanName: string;
  optionDiscountRate?: number;
  blurPrices?: boolean;
  onTotalChange?: (total: number, selectedOptions: string[]) => void;
}

export default function OptionCalculator({ basePlanPrice, basePlanName, optionDiscountRate = 10, blurPrices = false, onTotalChange }: OptionCalculatorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const selectedOptions = OPTIONS.filter(o => selected.has(o.id));
  const optionsRegular = selectedOptions.reduce((sum, o) => sum + o.price, 0);
  const optionsDiscounted = Math.round(optionsRegular * (1 - optionDiscountRate / 100));
  const total = basePlanPrice + optionsDiscounted;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    const opts = OPTIONS.filter(o => next.has(o.id));
    const disc = Math.round(opts.reduce((s, o) => s + o.price, 0) * (1 - optionDiscountRate / 100));
    onTotalChange?.(basePlanPrice + disc, opts.map(o => o.name));
  }

  const visible = showAll ? OPTIONS : OPTIONS.filter(o => o.popular);

  // Group by category when showing all
  const categories = showAll
    ? [...new Set(OPTIONS.map(o => o.category))]
    : [];

  return (
    <div>
      <p className="text-sm font-semibold mb-1">
        選択中のプラン: <span className="text-amber-600">{basePlanName}</span>
      </p>
      <p className="text-xs text-emerald-600 font-semibold mb-3">
        Web予約特典: オプション全メニュー{optionDiscountRate}%OFF適用中
      </p>

      {!showAll ? (
        <div className="space-y-0">
          {visible.map(opt => (
            <label key={opt.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-2.5">
                <input type="checkbox" checked={selected.has(opt.id)} onChange={() => toggle(opt.id)} className="accent-amber-600 w-4 h-4" />
                <div>
                  <span className="text-sm">{opt.name}</span>
                  <span className="text-[10px] text-amber-600 font-bold ml-1">★人気</span>
                  <div className="text-[11px] text-gray-400">{opt.description} ｜ {opt.time}</div>
                </div>
              </div>
              <div className={`text-right whitespace-nowrap ${blurPrices ? 'blur-[5px] select-none' : ''}`}>
                <div className="text-[10px] text-gray-400 line-through">+{formatPrice(opt.price)}</div>
                <div className="text-sm font-semibold text-amber-700">+{formatPrice(Math.round(opt.price * (1 - optionDiscountRate / 100)))}</div>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div>
          {categories.map(cat => (
            <div key={cat} className="mb-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 py-1.5 bg-gray-50 rounded">{CATEGORY_LABELS[cat]}</div>
              {OPTIONS.filter(o => o.category === cat).map(opt => (
                <label key={opt.id} className="flex items-center justify-between py-2 px-1 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={selected.has(opt.id)} onChange={() => toggle(opt.id)} className="accent-amber-600 w-4 h-4" />
                    <div>
                      <span className="text-sm">
                        {opt.name}
                        {opt.popular && <span className="text-[10px] text-amber-600 font-bold ml-1">★人気</span>}
                      </span>
                      <div className="text-[11px] text-gray-400">{opt.description} ｜ {opt.time}</div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-[10px] text-gray-400 line-through">+{formatPrice(opt.price)}</div>
                    <div className="text-sm font-semibold text-amber-700">+{formatPrice(Math.round(opt.price * (1 - optionDiscountRate / 100)))}</div>
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {!showAll && (
        <button onClick={() => setShowAll(true)} className="text-sm text-amber-600 font-semibold mt-2 hover:underline">
          ▼ その他のオプションを表示（全{OPTIONS.length}種）
        </button>
      )}

      {/* Running total */}
      <div className={`mt-4 bg-[#0f1c2e] text-white rounded-xl p-4 ${blurPrices ? 'blur-[5px] select-none' : ''}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm">お見積もり合計（税込）</span>
          <span className="text-2xl font-bold text-amber-300">{formatPrice(total)}</span>
        </div>
        {selected.size > 0 && (
          <div className="text-xs text-white/50 mt-1.5 flex justify-between">
            <span>コーティング: {formatPrice(basePlanPrice)} + オプション{selected.size}点: {formatPrice(optionsDiscounted)}</span>
            <span className="text-emerald-400">オプション{optionDiscountRate}%OFF適用</span>
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-3 mt-3 flex-wrap">
        <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50">
          📄 見積もりをPDFダウンロード
        </button>
        <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold bg-white hover:bg-gray-50">
          ✉️ 見積もりをメールで送る
        </button>
      </div>
    </div>
  );
}
