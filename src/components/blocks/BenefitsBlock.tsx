import Link from 'next/link';
import type { BenefitsConfig } from '@/lib/block-types';

interface BenefitsBlockProps {
  config: BenefitsConfig;
  basePath: string;
  discountRate: number;
}

export default function BenefitsBlock({ config, basePath, discountRate }: BenefitsBlockProps) {
  if (config.items.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-amber-500">
      <div className="max-w-[700px] mx-auto">
        <h2
          className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] text-center mb-2"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          Web予約限定 {config.items.length}つの特典
        </h2>
        <p className="text-sm text-[#0C3290]/60 text-center mb-8">
          最大{discountRate}%OFFの割引をはじめ、特典が充実
        </p>
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200">
          <ol className="space-y-4">
            {config.items.map((item, i) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0C3290] text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[#0C3290] text-sm font-medium leading-relaxed pt-0.5">
                  {item.text}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {config.show_booking_cta && (
              <Link
                href={`${basePath}/booking`}
                className="flex-1 text-center px-6 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:opacity-90 transition-colors"
              >
                Web予約する
              </Link>
            )}
            {config.show_inquiry_cta && (
              <Link
                href={`${basePath}/booking?mode=inquiry`}
                className="flex-1 text-center px-6 py-3 bg-gray-100 border border-gray-200 text-[#0C3290] font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                お問い合わせ
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
