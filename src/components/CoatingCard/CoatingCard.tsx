import { CoatingProduct } from "../../data/coatings";
import BarGraph from "./BarGraph";
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
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-black tracking-wider px-2.5 py-1 rounded-sm z-10 shadow-md uppercase">
            NEW
          </div>
        )}
        {(() => {
          const splitIdx = coating.name.indexOf('・');
          const twoLines = splitIdx > 0 && coating.name.length >= 11;
          const sizeClass = twoLines
            ? 'text-2xl'
            : coating.name.length >= 9
              ? 'text-2xl'
              : coating.name.length >= 7
                ? 'text-3xl'
                : 'text-4xl';
          return (
            <h2
              className={`${sizeClass} font-black ${twoLines ? 'leading-[1.05]' : 'leading-none whitespace-nowrap'} ${coating.themeColor.text}`}
              style={{
                fontFamily: '"Noto Sans JP", sans-serif',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                transform: 'scaleX(0.88)',
                transformOrigin: 'center',
                display: 'inline-block',
              }}
            >
              {twoLines ? (
                <>
                  {coating.name.slice(0, splitIdx + 1)}
                  <br />
                  {coating.name.slice(splitIdx + 1)}
                </>
              ) : (
                coating.name
              )}
            </h2>
          );
        })()}
        {coating.subtitle && (
          <p
            className={`text-[13px] ${coating.themeColor.text} mt-2`}
            style={{
              fontFamily: '"Oswald", "Noto Sans JP", sans-serif',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {coating.subtitle}
          </p>
        )}
      </div>

      <div className="p-2 space-y-2">
        {/* Graph Section */}
        <div className="bg-white rounded p-4 shadow-sm relative pt-6">
          <BarGraph data={coating.radar} color={strokeColor} isFreshKeeper={coating.name === 'フレッシュキーパー'} />
        </div>

        {/* Layers Section */}
        <div className="bg-white rounded p-2 shadow-sm">
          <LayerGraphic layers={coating.layers} />
        </div>

        {/* Rating Section */}
        <div className="bg-white rounded p-3 shadow-sm flex items-center justify-center gap-4">
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
