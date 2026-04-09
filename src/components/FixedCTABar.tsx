'use client';

import Link from 'next/link';

export default function FixedCTABar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#0f1c2e] border-b border-amber-500/30">
      <div className="max-w-[1100px] mx-auto px-4 py-1.5 flex items-center justify-between">
        <span className="text-white/50 text-[11px] hidden sm:block">Web予約限定割引あり</span>
        <div className="flex gap-2 mx-auto sm:mx-0">
          <Link
            href="/booking"
            className="px-4 py-1.5 bg-amber-500 text-white text-[12px] font-bold rounded-md hover:bg-amber-500 transition-colors"
          >
            予約する
          </Link>
          <Link
            href="/booking?mode=inquiry"
            className="px-4 py-1.5 bg-white/10 border border-white/20 text-white text-[12px] font-semibold rounded-md hover:bg-white/20 transition-colors"
          >
            お問い合わせ
          </Link>
        </div>
      </div>
    </div>
  );
}
