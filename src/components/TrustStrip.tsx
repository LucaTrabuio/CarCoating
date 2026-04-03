interface TrustStripProps {
  googleRating?: number;
  googleReviewCount?: number;
  latestReview?: string;
}

export default function TrustStrip({ googleRating = 4.8, googleReviewCount = 0, latestReview }: TrustStripProps) {
  return (
    <div className="bg-[#0f1c2e] py-2.5 border-t border-amber-600/20">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center justify-center gap-4 flex-wrap text-xs text-white/85">
        <span className="text-yellow-400 tracking-wider">★★★★★</span>
        <span className="font-bold text-white">{googleRating}</span>
        <span className="opacity-60">Google口コミ {googleReviewCount}件</span>
        {latestReview && (
          <span className="opacity-70 italic">「{latestReview}」</span>
        )}
      </div>
    </div>
  );
}
