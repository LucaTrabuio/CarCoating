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
    <section className="py-14 px-5 bg-gradient-to-br from-amber-50 via-amber-50 to-amber-50">
      <div className="max-w-[700px] mx-auto">
        <h2
          className="text-xl md:text-2xl font-bold text-[#0f1c2e] text-center mb-2"
          style={{ fontFamily: '"Noto Serif JP", serif' }}
        >
          Web予約限定 {config.items.length}つの特典
        </h2>
        <p className="text-sm text-slate-400 text-center mb-8">
          最大{discountRate}%OFFの割引をはじめ、特典が充実
        </p>
        <div className="bg-gradient-to-br from-amber-500 via-amber-700 to-amber-700 rounded-2xl p-6 md:p-8 shadow-lg">
          <ol className="space-y-4">
            {config.items.map((item, i) => (
              <li key={item.id} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-white text-sm font-medium leading-relaxed pt-0.5">
                  {item.text}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {config.show_booking_cta && (
              <Link
                href={`${basePath}/booking`}
                className="flex-1 text-center px-6 py-3 bg-white text-amber-700 font-bold rounded-lg text-sm hover:bg-amber-50 transition-colors"
              >
                Web予約する
              </Link>
            )}
            {config.show_inquiry_cta && (
              <Link
                href={`${basePath}/booking?mode=inquiry`}
                className="flex-1 text-center px-6 py-3 bg-white/15 border border-white/30 text-white font-semibold rounded-lg text-sm hover:bg-white/25 transition-colors"
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
