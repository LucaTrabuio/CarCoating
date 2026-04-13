'use client';

import { FONT_PRESETS } from '@/lib/types';

interface DynamicBannerProps {
  title: string;
  discountRate: number;
  deadline: string;
  colorCode: string;
  fontId?: string;
}

export default function DynamicBanner({ title, discountRate, deadline, fontId }: DynamicBannerProps) {
  const fontPreset = fontId ? FONT_PRESETS.find(f => f.id === fontId) : null;
  const fontStyle = fontPreset ? { fontFamily: fontPreset.family } : {};

  const bannerText = `${title} ｜ 最大${discountRate}%OFF ｜ Web予約限定 ｜ ${deadline}まで`;

  return (
    <div
      className="font-bold text-[14px] overflow-hidden whitespace-nowrap"
      style={{ background: '#F0EA01', color: '#0C3290', ...fontStyle }}
    >
      <div className="flex animate-marquee py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="mx-12 shrink-0">
            {bannerText}
          </span>
        ))}
      </div>
    </div>
  );
}
