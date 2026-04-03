'use client';

interface MobileCTAProps {
  tel: string;
  lineUrl?: string;
}

export default function MobileCTA({ tel, lineUrl }: MobileCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.15)]">
      <a
        href={`tel:${tel}`}
        className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#0f1c2e] text-white text-[13px] font-bold"
      >
        &#9742; 電話する
      </a>
      {lineUrl ? (
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#06c755] text-white text-[13px] font-bold"
        >
          LINE相談
        </a>
      ) : (
        <a
          href="#booking"
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-amber-600 text-white text-[13px] font-bold"
        >
          Web予約
        </a>
      )}
    </div>
  );
}
