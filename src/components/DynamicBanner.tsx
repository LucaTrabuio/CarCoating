'use client';

import { FONT_PRESETS } from '@/lib/types';

interface DynamicBannerProps {
  title: string;
  discountRate: number;
  deadline: string;
  colorCode: string;
  fontId?: string;
  newsText?: string;
}

export default function DynamicBanner({ title, discountRate, deadline, fontId, newsText }: DynamicBannerProps) {
  const fontPreset = fontId ? FONT_PRESETS.find(f => f.id === fontId) : null;
  const fontStyle = fontPreset ? { fontFamily: fontPreset.family } : {};

  const isNews = discountRate <= 0 || !!newsText;
  const bannerText = isNews
    ? `お知らせ ｜ ${newsText || `${title}についての最新情報はこちら`}`
    : `${title} ｜ 最大${discountRate}%OFF ｜ Web予約限定 ｜ ${deadline}まで`;

  // Build one "set" of text that fills the viewport, then duplicate it for seamless loop.
  // Each set is forced to span at least 100vw so the marquee never leaves an empty
  // gap on wide displays. justify-around distributes the repeated text evenly within
  // each set, so the duplicate set picks up exactly where the first ends.
  const perSet = bannerText.length < 30 ? 8 : bannerText.length < 50 ? 5 : 4;
  const gap = bannerText.length < 30 ? 'mx-6' : 'mx-10';

  const renderSet = (keyPrefix: string) => (
    <div className="flex shrink-0 min-w-[100vw] justify-around">
      {Array.from({ length: perSet }).map((_, i) => (
        <span key={`${keyPrefix}-${i}`} className={`${gap} shrink-0`}>{bannerText}</span>
      ))}
    </div>
  );

  return (
    <div
      className="font-bold text-[14px] overflow-hidden whitespace-nowrap"
      style={{ background: isNews ? '#0C3290' : '#F0EA01', color: isNews ? '#F0EA01' : '#0C3290', ...fontStyle }}
    >
      <div className="flex w-max animate-marquee py-3">
        {renderSet('a')}
        {renderSet('b')}
      </div>
    </div>
  );
}
