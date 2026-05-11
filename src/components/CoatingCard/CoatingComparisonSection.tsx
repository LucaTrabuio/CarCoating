import { coatingsData } from "@/data/coatings";
import CoatingCard from "./CoatingCard";
import ScrollFadeIn from "@/components/ScrollFadeIn";

// Highest price → lowest
const PRICE_ORDER: Record<string, number> = {
  exkeeper: 0,
  ecodiamond: 1,
  dia2: 2,
  iron: 3,
  diamond: 4,
  fresh: 5,
  crystal: 6,
};

export default function CoatingComparisonSection() {
  const sorted = [...coatingsData].sort(
    (a, b) => (PRICE_ORDER[a.id] ?? 99) - (PRICE_ORDER[b.id] ?? 99),
  );

  return (
    <ScrollFadeIn>
      <section className="py-16 px-5 bg-gradient-to-b from-white to-slate-50 border-t border-gray-100">
        <div className="max-w-[1300px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティング性能比較</h2>
            <p className="text-sm text-gray-400 mt-2">各コーティングの艶、耐候力、持続時間、洗車回数の減り方を独自開発のレーダーチャートで比較</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            {sorted.map(coating => (
              <div key={coating.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] flex justify-center">
                <CoatingCard coating={coating} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollFadeIn>
  );
}
