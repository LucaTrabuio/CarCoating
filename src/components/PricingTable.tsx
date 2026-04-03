'use client';

import { coatingTiers } from '@/data/coating-tiers';
import { CarSize, CoatingTier } from '@/lib/types';
import { formatPrice, getWebPrice, getMaintenancePrice } from '@/lib/pricing';
import Link from 'next/link';

interface PricingTableProps {
  size: CarSize;
  discountRate: number;
  storeId: string;
}

export default function PricingTable({ size, discountRate, storeId }: PricingTableProps) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#0f1c2e] text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold">プラン名</th>
            <th className="px-3 py-3 text-left text-xs font-semibold">耐久</th>
            <th className="px-3 py-3 text-left text-xs font-semibold">通常価格</th>
            <th className="px-3 py-3 text-left text-xs font-semibold">Web割価格</th>
            <th className="px-3 py-3 text-left text-xs font-semibold">メンテ</th>
            <th className="px-3 py-3 text-xs font-semibold"></th>
          </tr>
        </thead>
        <tbody>
          {coatingTiers.map(tier => {
            const regular = tier.prices[size];
            const web = getWebPrice(tier, size, discountRate);
            const maint = getMaintenancePrice(tier, size);
            const isPopular = tier.id === 'diamond';

            return (
              <tr key={tier.id} className={`border-b border-gray-100 hover:bg-amber-50/50 ${isPopular ? 'bg-amber-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-bold text-[#0f1c2e]">
                    {isPopular && <span className="text-amber-600">★ </span>}
                    {tier.name}
                  </div>
                  <div className="text-xs text-gray-400">{tier.application_time}</div>
                </td>
                <td className="px-3 py-3 text-xs text-gray-500">{tier.durability_years}</td>
                <td className="px-3 py-3 text-xs text-gray-400 line-through">{formatPrice(regular)}</td>
                <td className="px-3 py-3 font-bold text-amber-700">{formatPrice(web)}</td>
                <td className="px-3 py-3 text-xs text-gray-500">
                  {maint ? `${formatPrice(maint)}/${tier.maintenance_interval.includes('2年') ? '2年' : '年'}` : '—'}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/${storeId}/booking?plan=${tier.id}&size=${size}`}
                    className="text-amber-600 text-xs font-semibold hover:underline whitespace-nowrap"
                  >
                    選択 →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
