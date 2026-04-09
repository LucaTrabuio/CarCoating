'use client';

import { useState } from 'react';
import { formatPrice, applyDiscount } from '@/lib/pricing';
import { DEFAULT_SERVICE_OPTIONS as OPTIONS, CATEGORY_LABELS } from '@/data/service-options';

interface OptionCalculatorProps {
  basePlanPrice: number;
  basePlanName: string;
  optionDiscountRate?: number;
  showDiscountBanner?: boolean;
  blurPrices?: boolean;
  onTotalChange?: (total: number, selectedOptions: string[]) => void;
}

export default function OptionCalculator({ basePlanPrice, basePlanName, optionDiscountRate = 10, showDiscountBanner = true, blurPrices = false, onTotalChange }: OptionCalculatorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const selectedOptions = OPTIONS.filter(o => selected.has(o.id));
  const optionsRegular = selectedOptions.reduce((sum, o) => sum + o.price, 0);
  const optionsDiscounted = applyDiscount(optionsRegular, optionDiscountRate);
  const total = basePlanPrice + optionsDiscounted;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    const opts = OPTIONS.filter(o => next.has(o.id));
    const disc = applyDiscount(opts.reduce((s, o) => s + o.price, 0), optionDiscountRate);
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
        選択中のプラン: <span className="text-amber-500">{basePlanName}</span>
      </p>
      {showDiscountBanner && optionDiscountRate > 0 && (
        <p className="text-xs text-emerald-600 font-semibold mb-3">
          Web予約特典: オプション全メニュー{optionDiscountRate}%OFF適用中
        </p>
      )}

      {!showAll ? (
        <div className="space-y-0">
          {visible.map(opt => (
            <label key={opt.id} className="flex items-center justify-between py-2.5 px-1 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-2.5">
                <input type="checkbox" checked={selected.has(opt.id)} onChange={() => toggle(opt.id)} className="accent-amber-500 w-4 h-4" />
                <div>
                  <span className="text-sm">{opt.name}</span>
                  <span className="text-[10px] text-amber-500 font-bold ml-1">★人気</span>
                  <div className="text-[11px] text-gray-400">{opt.description} ｜ {opt.time}</div>
                </div>
              </div>
              <div className={`text-right whitespace-nowrap ${blurPrices ? 'blur-[5px] select-none' : ''}`}>
                <div className="text-[10px] text-gray-400 line-through">+{formatPrice(opt.price)}</div>
                <div className="text-sm font-semibold text-amber-700">+{formatPrice(applyDiscount(opt.price, optionDiscountRate))}</div>
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
                    <input type="checkbox" checked={selected.has(opt.id)} onChange={() => toggle(opt.id)} className="accent-amber-500 w-4 h-4" />
                    <div>
                      <span className="text-sm">
                        {opt.name}
                        {opt.popular && <span className="text-[10px] text-amber-500 font-bold ml-1">★人気</span>}
                      </span>
                      <div className="text-[11px] text-gray-400">{opt.description} ｜ {opt.time}</div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-[10px] text-gray-400 line-through">+{formatPrice(opt.price)}</div>
                    <div className="text-sm font-semibold text-amber-700">+{formatPrice(applyDiscount(opt.price, optionDiscountRate))}</div>
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {!showAll && (
        <button onClick={() => setShowAll(true)} className="text-sm text-amber-500 font-semibold mt-2 hover:underline">
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
