'use client';

import { FONT_PRESETS } from '@/lib/types';

interface DynamicBannerProps {
  title: string;
  discountRate: number;
  deadline: string;
  colorCode: string;
  fontId?: string;
  newsText?: string; // When set, shows news instead of campaign
}

export default function DynamicBanner({ title, discountRate, deadline, fontId, newsText }: DynamicBannerProps) {
  const fontPreset = fontId ? FONT_PRESETS.find(f => f.id === fontId) : null;
  const fontStyle = fontPreset ? { fontFamily: fontPreset.family } : {};

  const isNews = discountRate <= 0 || !!newsText;
  const bannerText = isNews
    ? `お知らせ ｜ ${newsText || `${title}についての最新情報はこちら`}`
    : `${title} ｜ 最大${discountRate}%OFF ｜ Web予約限定 ｜ ${deadline}まで`;

  return (
    <div
      className="font-bold text-[14px] overflow-hidden whitespace-nowrap"
      style={{ background: isNews ? '#0C3290' : '#F0EA01', color: isNews ? '#F0EA01' : '#0C3290', ...fontStyle }}
    >
      <div className="flex w-max animate-marquee py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="mx-12 shrink-0">
            {bannerText}
          </span>
        ))}
      </div>
    </div>
  );
}
