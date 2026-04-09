import { FONT_PRESETS } from '@/lib/types';

interface DynamicBannerProps {
  title: string;
  discountRate: number;
  deadline: string;
  colorCode: string;
  fontId?: string;
}

export default function DynamicBanner({ title, discountRate, deadline, colorCode, fontId }: DynamicBannerProps) {
  const bgStyle = colorCode
    ? { background: `linear-gradient(135deg, ${colorCode}, ${colorCode}dd)` }
    : { background: 'linear-gradient(135deg, #001AFF, #0033FFdd)' };

  const fontPreset = fontId ? FONT_PRESETS.find(f => f.id === fontId) : null;
  const fontStyle = fontPreset ? { fontFamily: fontPreset.family } : {};

  return (
    <div
      className="text-white text-center py-3 px-5 font-bold text-[15px]"
      style={{ ...bgStyle, ...fontStyle }}
    >
      {title} ｜ 最大{discountRate}%OFF
      <div className="text-[11px] font-normal opacity-80 mt-0.5">
        Web予約限定 ｜ {deadline}まで
      </div>
    </div>
  );
}
