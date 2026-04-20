"use client";

type GraphData = {
  subject: string;
  A: number;
  fullMark: number;
};

type Props = {
  data: GraphData[];
  color: string;
  isFreshKeeper?: boolean;
};

// Lighten/darken a hex color by % (-100..100)
function shade(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  const adj = (c: number) => {
    const v = pct >= 0 ? c + (255 - c) * (pct / 100) : c + c * (pct / 100);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

// Linear-interpolate between two hex colors (t in 0..1)
function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  if (pa.length !== 6 || pb.length !== 6) return a;
  const parse = (s: string) => [0, 2, 4].map((i) => parseInt(s.substr(i, 2), 16));
  const [r1, g1, b1] = parse(pa);
  const [r2, g2, b2] = parse(pb);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

export default function BarGraph({ data, color }: Props) {
  const maxValue = 5;
  const colorLight = shade(color, 22);
  // Deep saturated burnt-orange shadow — keeps a hint of brand identity
  // but stays vivid/chromatic instead of muddy.
  const murky = mixHex('#9A3412', color, 0.12);

  return (
    <div className="w-full flex flex-col justify-center gap-5 py-2">
      {data.map((item, i) => {
        const label = item.subject === '洗車の減り方' ? '洗車頻度' : item.subject;
        const score = Math.round(item.A);
        const pct = (item.A / maxValue) * 100;

        return (
          <div key={i} className="flex flex-col w-full gap-2">
            {/* Label + Score */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-700 tracking-tight">{label}</span>
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span
                  className="text-[22px] font-black leading-none"
                  style={{ color: shade(color, -28), letterSpacing: '-0.02em' }}
                >
                  {item.A}
                </span>
                <span
                  className="text-[10px] font-bold leading-none"
                  style={{ color: 'rgba(30, 41, 59, 0.55)' }}
                >
                  /{maxValue}
                </span>
              </div>
            </div>

            {/* Gauge — continuous track with colored fill + inner tick marks */}
            <div className="relative w-full h-[10px] rounded-full bg-slate-100 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${murky} 0%, ${color} 40%, ${colorLight} 100%)`,
                  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.35), 0 0 8px ${color}55`,
                  transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
              {/* Segment tick marks */}
              <div className="absolute inset-0 flex pointer-events-none">
                {[...Array(maxValue - 1)].map((_, d) => (
                  <div key={d} className="flex-1 relative">
                    <span className="absolute top-0 right-0 h-full w-px bg-white/60" />
                  </div>
                ))}
                <div className="flex-1" />
              </div>
            </div>

            {/* Score dots — subtle state indicators below gauge */}
            <div className="flex gap-1 mt-0.5">
              {[...Array(maxValue)].map((_, d) => {
                const isFilled = d < score;
                return (
                  <span
                    key={d}
                    className="h-1 w-1 rounded-full transition-colors duration-500"
                    style={{
                      backgroundColor: isFilled ? color : '#e2e8f0',
                      boxShadow: isFilled ? `0 0 3px ${color}88` : 'none',
                    }}
                  />
                );
              })}
              {/* dots stretch to fill full width */}
              <span className="flex-1" />
            </div>

          </div>
        );
      })}
    </div>
  );
}
