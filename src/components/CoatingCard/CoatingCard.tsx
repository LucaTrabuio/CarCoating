import { CoatingProduct } from "../../data/coatings";
import RadarGraph from "./RadarGraph";
import StarRating from "./StarRating";
import LayerGraphic from "./LayerGraphic";

type Props = {
  coating: CoatingProduct;
};

export default function CoatingCard({ coating }: Props) {
  // Extract main color to pass to Radar
  // e.g. "bg-[#29AEE2]" -> "#29AEE2"
  const hexMatch = coating.themeColor.bg.match(/\[(.*?)\]/);
  const strokeColor = hexMatch ? hexMatch[1] : "#3b82f6";

  return (
    <div className={`relative flex flex-col border-4 ${coating.themeColor.border} bg-[#F0F4F8] w-full max-w-sm rounded`}>
      {/* Top Banner */}
      <div className={`flex flex-col text-center justify-center pt-6 pb-4 relative ${coating.themeColor.bg}`}>
        {coating.isNew && (
           <div className="absolute top-0 left-0 bg-red-600 text-white text-sm font-bold px-2 py-1 transform -translate-x-2 -translate-y-2 rounded-full z-10 w-12 h-12 flex items-center justify-center shadow-md">
             NEW!
           </div>
        )}
        <h2 className={`text-4xl font-black ${coating.themeColor.text}`}>{coating.name}</h2>
        {coating.subtitle && (
          <p className={`text-sm font-bold tracking-widest ${coating.themeColor.text} mt-1`}>
            {coating.subtitle}
          </p>
        )}
      </div>

      <div className="p-2 space-y-2">
        {/* Radar Section */}
        <div className="bg-white rounded p-4 shadow-sm relative">
          <p className="text-center font-bold text-sm mb-[-10px] text-gray-800 absolute w-full left-0 z-10">洗車の回数の減り方</p>
          <RadarGraph data={coating.radar} color={strokeColor} />
          <p className="text-center font-bold text-sm mt-[-10px] text-gray-800">持続時間</p>
        </div>

        {/* Layers Section */}
        <div className="bg-white rounded p-2 shadow-sm">
          <LayerGraphic layers={coating.layers} />
        </div>

        {/* Rating Section */}
        <div className="bg-white rounded p-3 shadow-sm flex items-center justify-center gap-6">
          <p className="font-bold text-gray-700">汚れにくさ</p>
          <StarRating rating={coating.stars} />
        </div>
      </div>

      {/* Footer Catchphrase */}
      <div className="mt-auto p-2">
        <div className="bg-white py-2 px-4 shadow-sm text-center font-bold border border-gray-100">
           {coating.catchphrase}
        </div>
      </div>
    </div>
  );
}
