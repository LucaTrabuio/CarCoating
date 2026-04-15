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

  // Build one "set" of text that fills the viewport, then duplicate it for seamless loop
  // Short text needs more repetitions per set to fill the screen
  const perSet = bannerText.length < 30 ? 6 : bannerText.length < 50 ? 4 : 3;
  const gap = bannerText.length < 30 ? 'mx-6' : 'mx-10';

  const oneSet = Array.from({ length: perSet }).map((_, i) => (
    <span key={i} className={`${gap} shrink-0`}>{bannerText}</span>
  ));

  return (
    <div
      className="font-bold text-[14px] overflow-hidden whitespace-nowrap"
      style={{ background: isNews ? '#0C3290' : '#F0EA01', color: isNews ? '#F0EA01' : '#0C3290', ...fontStyle }}
    >
      <div className="flex w-max animate-marquee py-3">
        {/* First set */}
        {oneSet}
        {/* Duplicate set for seamless loop (-50% translation) */}
        {oneSet.map((el, i) => <span key={`dup-${i}`} className={`${gap} shrink-0`}>{bannerText}</span>)}
      </div>
    </div>
  );
}
