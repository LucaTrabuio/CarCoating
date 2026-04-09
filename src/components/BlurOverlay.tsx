import Link from 'next/link';

interface BlurOverlayProps {
  children: React.ReactNode;
  ctaText?: string;
  ctaHref?: string;
  subtitle?: string;
}

export default function BlurOverlay({
  children,
  ctaText = '詳細を見るにはお問い合わせください',
  ctaHref = '/booking?mode=inquiry',
  subtitle = '料金の詳細はお問い合わせ・ご予約後にご案内いたします',
}: BlurOverlayProps) {
  return (
    <div className="relative">
      <div className="blur-[6px] select-none pointer-events-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
        <p className="text-sm text-slate-600 font-semibold mb-2 text-center px-4">{subtitle}</p>
        <Link
          href={ctaHref}
          className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors shadow-lg"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
