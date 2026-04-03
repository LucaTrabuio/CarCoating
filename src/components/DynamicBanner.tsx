interface DynamicBannerProps {
  title: string;
  discountRate: number;
  deadline: string;
  colorCode: string;
}

export default function DynamicBanner({ title, discountRate, deadline, colorCode }: DynamicBannerProps) {
  const bgStyle = colorCode
    ? { background: `linear-gradient(135deg, ${colorCode}, ${colorCode}dd)` }
    : { background: 'linear-gradient(135deg, #c49a2a, #e8c96d 40%, #c49a2a 60%, #a07d1e)' };

  return (
    <div
      className="text-white text-center py-3 px-5 font-bold text-[15px]"
      style={bgStyle}
    >
      {title} ｜ 最大{discountRate}%OFF
      <div className="text-[11px] font-normal opacity-80 mt-0.5">
        Web予約限定 ｜ {deadline}まで
      </div>
    </div>
  );
}
