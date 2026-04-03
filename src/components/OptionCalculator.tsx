'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/pricing';

interface OptionItem {
  id: string;
  name: string;
  price: number;
  popular: boolean;
}

const OPTIONS: OptionItem[] = [
  { id: 'window-full', name: '超撥水ウィンドウコーティング（全面）', price: 8270, popular: true },
  { id: 'wheel-single', name: 'ホイールコーティング（シングル）', price: 10700, popular: true },
  { id: 'lens', name: 'レンズコーティング', price: 6810, popular: true },
  { id: 'headlight', name: 'ヘッドライトクリーン＆コーティング', price: 11630, popular: false },
  { id: 'disinfect', name: '車内除菌抗菌「オールクリア」', price: 4650, popular: false },
  { id: 'polish', name: '細密研磨', price: 18600, popular: false },
  { id: 'window-front', name: '超撥水ウィンドウコーティング（フロント）', price: 3720, popular: false },
  { id: 'wheel-double', name: 'ホイールコーティング（ダブル）', price: 15900, popular: false },
  { id: 'fender', name: '樹脂フェンダーキーパー', price: 6280, popular: false },
  { id: 'oil-film-full', name: '油膜取り（全面）', price: 4750, popular: false },
  { id: 'iron', name: '鉄粉取り', price: 2830, popular: false },
  { id: 'sap', name: '樹液取り', price: 2750, popular: false },
];

interface OptionCalculatorProps {
  basePlanPrice: number;
  basePlanName: string;
  onTotalChange?: (total: number, selectedOptions: string[]) => void;
}

export default function OptionCalculator({ basePlanPrice, basePlanName, onTotalChange }: OptionCalculatorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const optionsTotal = OPTIONS.filter(o => selected.has(o.id)).reduce((sum, o) => sum + o.price, 0);
  const total = basePlanPrice + optionsTotal;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    const names = OPTIONS.filter(o => next.has(o.id)).map(o => o.name);
    onTotalChange?.(basePlanPrice + OPTIONS.filter(o => next.has(o.id)).reduce((s, o) => s + o.price, 0), names);
  }

  const visible = showAll ? OPTIONS : OPTIONS.filter(o => o.popular);

  return (
    <div>
      <p className="text-sm font-semibold mb-3">
        選択中のプラン: <span className="text-amber-600">{basePlanName}</span>
      </p>

      <div className="space-y-0">
        {visible.map(opt => (
          <label key={opt.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={selected.has(opt.id)}
                onChange={() => toggle(opt.id)}
                className="accent-amber-600 w-4 h-4"
              />
              <span className="text-sm">
                {opt.name}
                {opt.popular && <span className="text-[10px] text-amber-600 font-bold ml-1">★人気</span>}
              </span>
            </div>
            <span className="text-sm font-semibold text-[#0f1c2e] whitespace-nowrap">+{formatPrice(opt.price)}</span>
          </label>
        ))}
      </div>

      {!showAll && (
        <button onClick={() => setShowAll(true)} className="text-sm text-amber-600 font-semibold mt-2 hover:underline">
          ▼ その他のオプションを表示（全{OPTIONS.length}種）
        </button>
      )}

      {/* Running total */}
      <div className="mt-4 bg-[#0f1c2e] text-white rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm">お見積もり合計（税込）</span>
        <span className="text-2xl font-bold text-amber-300">{formatPrice(total)}</span>
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
