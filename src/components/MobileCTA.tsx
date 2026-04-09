'use client';

import { trackEvent } from '@/lib/track';

interface MobileCTAProps {
  tel: string;
  lineUrl?: string;
  storeId?: string;
  basePath?: string;
}

export default function MobileCTA({ tel, lineUrl, storeId, basePath = '' }: MobileCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.15)]">
      {tel && (
        <a
          href={`tel:${tel}`}
          onClick={() => storeId && trackEvent(storeId, 'phone_call')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#0f1c2e] text-white text-[13px] font-bold"
        >
          &#9742; 電話する
        </a>
      )}
      {lineUrl ? (
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => storeId && trackEvent(storeId, 'line_click')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#06c755] text-white text-[13px] font-bold"
        >
          LINE相談
        </a>
      ) : (
        <a
          href={`${basePath}/booking`}
          onClick={() => storeId && trackEvent(storeId, 'cta_booking')}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-amber-500 text-white text-[13px] font-bold"
        >
          Web予約
        </a>
      )}
    </div>
  );
}
