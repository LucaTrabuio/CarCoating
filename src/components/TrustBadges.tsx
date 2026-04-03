interface TrustBadgesProps {
  hasBooth: boolean;
  level1Count: number;
  level2Count: number;
}

export default function TrustBadges({ hasBooth, level1Count, level2Count }: TrustBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-[11px] bg-white/10 text-white/90 px-2.5 py-1 rounded font-semibold">
        KeePer PRO SHOP認定
      </span>
      {hasBooth && (
        <span className="text-[11px] bg-white/10 text-white/90 px-2.5 py-1 rounded font-semibold">
          専用ブース完備
        </span>
      )}
      {level1Count > 0 && (
        <span className="text-[11px] bg-white/10 text-white/90 px-2.5 py-1 rounded font-semibold">
          1級資格者 {level1Count}名
        </span>
      )}
      {level2Count > 0 && (
        <span className="text-[11px] bg-white/10 text-white/90 px-2.5 py-1 rounded font-semibold">
          2級資格者 {level2Count}名
        </span>
      )}
    </div>
  );
}
