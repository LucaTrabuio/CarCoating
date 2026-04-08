'use client';

import type { PricingConfig } from '@/lib/block-types';
import { coatingTiers } from '@/data/coating-tiers';

interface PricingEditorProps {
  config: PricingConfig;
  onChange: (config: PricingConfig) => void;
}

export default function PricingEditor({ config, onChange }: PricingEditorProps) {
  const blurFields = config.blur_fields ?? [];

  function toggleBlur(key: string) {
    const next = blurFields.includes(key)
      ? blurFields.filter(f => f !== key)
      : [...blurFields, key];
    onChange({ ...config, blur_fields: next });
  }

  function toggleAll(field: string) {
    const allKey = `all:${field}`;
    if (blurFields.includes(allKey)) {
      // Remove all:{field} and all individual tier:{field} entries
      onChange({ ...config, blur_fields: blurFields.filter(f => f !== allKey && !f.endsWith(`:${field}`)) });
    } else {
      // Add all:{field}, remove individual entries
      const cleaned = blurFields.filter(f => !f.endsWith(`:${field}`));
      onChange({ ...config, blur_fields: [...cleaned, allKey] });
    }
  }

  const featuredTiers = config.featured_tier_ids
    .map(id => coatingTiers.find(t => t.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">価格ブラー設定</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 pr-2">コース</th>
              <th className="text-center py-1 px-2">料金</th>
              <th className="text-center py-1 px-2">メンテ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="py-1.5 pr-2 font-semibold">全コース</td>
              <td className="text-center py-1.5">
                <input type="checkbox" checked={blurFields.includes('all:web_price')}
                  onChange={() => toggleAll('web_price')} className="rounded border-gray-300" />
              </td>
              <td className="text-center py-1.5">
                <input type="checkbox" checked={blurFields.includes('all:maintenance_price')}
                  onChange={() => toggleAll('maintenance_price')} className="rounded border-gray-300" />
              </td>
            </tr>
            {featuredTiers.map(tier => {
              if (!tier) return null;
              const isAllWeb = blurFields.includes('all:web_price');
              const isAllMaint = blurFields.includes('all:maintenance_price');
              return (
                <tr key={tier.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">{tier.name}</td>
                  <td className="text-center py-1.5">
                    <input type="checkbox"
                      checked={isAllWeb || blurFields.includes(`${tier.id}:web_price`)}
                      disabled={isAllWeb}
                      onChange={() => toggleBlur(`${tier.id}:web_price`)}
                      className="rounded border-gray-300" />
                  </td>
                  <td className="text-center py-1.5">
                    <input type="checkbox"
                      checked={isAllMaint || blurFields.includes(`${tier.id}:maintenance_price`)}
                      disabled={isAllMaint}
                      onChange={() => toggleBlur(`${tier.id}:maintenance_price`)}
                      className="rounded border-gray-300" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={config.show_discount_badge}
          onChange={e => onChange({ ...config, show_discount_badge: e.target.checked })}
          className="rounded border-gray-300" />
        割引バッジ表示
      </label>
    </div>
  );
}
