'use client';

import { coatingTiers } from '@/data/coating-tiers';
import { CarSize } from '@/lib/types';
import { formatPrice, getWebPrice, getTotalCostOverYears } from '@/lib/pricing';

interface ComparisonMatrixProps {
  size: CarSize;
  discountRate: number;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 tracking-wider text-xs">
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
}

export default function ComparisonMatrix({ size, discountRate }: ComparisonMatrixProps) {
  const tiers = coatingTiers.filter(t => ['crystal', 'fresh', 'diamond', 'dia2', 'ex', 'ex-premium'].includes(t.id));

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="min-w-[700px] w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-3 text-left font-semibold text-[#0f1c2e] bg-gray-50 sticky left-0 z-10 border-r border-gray-200">比較項目</th>
            {tiers.map(t => (
              <th key={t.id} className={`px-3 py-3 text-center font-semibold text-[#0f1c2e] ${t.id === 'diamond' ? 'bg-amber-50/50' : 'bg-gray-50'}`}>
                {t.id === 'diamond' && <span className="text-amber-600">★ </span>}
                {t.name.replace('キーパー', '').replace('プレミアム', 'P')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2.5 font-semibold sticky left-0 bg-white z-10 border-r border-gray-200">ツヤ</td>
            {tiers.map(t => (
              <td key={t.id} className={`px-3 py-2.5 text-center ${t.id === 'diamond' ? 'bg-amber-50/30' : ''}`}>
                <Stars count={t.gloss_rating} />
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2.5 font-semibold sticky left-0 bg-white z-10 border-r border-gray-200">撥水性</td>
            {tiers.map(t => (
              <td key={t.id} className={`px-3 py-2.5 text-center ${t.id === 'diamond' ? 'bg-amber-50/30' : ''}`}>
                <Stars count={t.water_repellency_rating} />
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2.5 font-semibold sticky left-0 bg-white z-10 border-r border-gray-200">耐久</td>
            {tiers.map(t => (
              <td key={t.id} className={`px-3 py-2.5 text-center font-semibold ${t.id === 'diamond' ? 'bg-amber-50/30' : ''}`}>
                {t.durability_years}
              </td>
            ))}
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2.5 font-semibold sticky left-0 bg-white z-10 border-r border-gray-200">Web割価格</td>
            {tiers.map(t => {
              const web = getWebPrice(t, size, discountRate);
              return (
                <td key={t.id} className={`px-3 py-2.5 text-center font-bold ${t.id === 'diamond' ? 'bg-amber-50/30 text-amber-700' : ''}`}>
                  {formatPrice(web)}
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-gray-100">
            <td className="px-3 py-2.5 font-semibold sticky left-0 bg-white z-10 border-r border-gray-200">5年総額</td>
            {tiers.map(t => {
              const total = getTotalCostOverYears(t, size, 5, discountRate);
              return (
                <td key={t.id} className={`px-3 py-2.5 text-center font-bold ${t.id === 'diamond' ? 'bg-amber-50/30 text-amber-700' : ''}`}>
                  {formatPrice(total)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="px-3 py-2.5 font-semibold sticky left-0 bg-white z-10 border-r border-gray-200">施工時間</td>
            {tiers.map(t => (
              <td key={t.id} className={`px-3 py-2.5 text-center ${t.id === 'diamond' ? 'bg-amber-50/30' : ''}`}>
                {t.application_time}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
