import Image from 'next/image';
import type { StaffBlockConfig, StaffMember } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';

interface StaffBlockProps {
  config: StaffBlockConfig;
  store?: V3StoreData;
}

function hasContent(m: StaffMember): boolean {
  return Boolean(m.photo_url || m.name || m.role || m.bio);
}

function parseStoreMembers(json?: string): StaffMember[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((m, i) => ({
      id: typeof m.id === 'string' ? m.id : String(i + 1),
      name: typeof m.name === 'string' ? m.name : '',
      role: typeof m.role === 'string' ? m.role : '',
      photo_url: typeof m.photo_url === 'string' ? m.photo_url : '',
      bio: typeof m.bio === 'string' ? m.bio : '',
      certifications: typeof m.certifications === 'string' ? m.certifications : '',
    }));
  } catch {
    return null;
  }
}

export default function StaffBlock({ config, store }: StaffBlockProps) {
  const fromStore = parseStoreMembers(store?.staff_members);
  const sourceMembers = fromStore ?? config.members ?? [];
  const members = sourceMembers.filter(hasContent);
  if (members.length === 0) return null;

  const BANNER = '\u793E\u5185\u30FB\u793E\u5916\u30B3\u30F3\u30C6\u30B9\u30C8\u5165\u8CDE\u8005\u3000\u591A\u6570\u5728\u7C4D\uFF01';
  const tagline = config.subheading || 'KeePer\u30B3\u30FC\u30C6\u30A3\u30F3\u30B0\u306F\u79C1\u305F\u3061\u306B\u304A\u307E\u304B\u305B\u4E0B\u3055\u3044\uFF01';
  const adminHeading = config.heading?.trim();

  return (
    <section
      className="relative py-16 md:py-20 px-5 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, #1A4DC9 0%, #0C3290 40%, #071a55 100%)',
      }}
    >
      {/* Decorative gold streaks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0 40px, rgba(245,158,11,0.4) 40px 41px)',
        }}
      />
      {/* Soft vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
      />

      <div className="relative max-w-[1100px] mx-auto">
        {/* Ribbon heading */}
        <div className="text-center mb-4">
          <h2
            className="font-black tracking-tight leading-[1.05]"
            style={{
              fontFamily: '"Noto Serif JP", "Noto Sans JP", serif',
              fontSize: 'clamp(2rem, 6.5vw, 4.75rem)',
              backgroundImage:
                'linear-gradient(180deg, #FFF8C8 0%, #FFE27A 30%, #FFC94A 60%, #A9772A 90%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.55)) drop-shadow(0 1px 2px rgba(80,40,0,0.7))',
              letterSpacing: '0.02em',
            }}
          >
            {BANNER}
          </h2>
          {adminHeading && (
            <p
              className="text-white text-2xl md:text-4xl font-black tracking-tight mt-8 md:mt-10"
              style={{
                fontFamily: '"Noto Sans JP", sans-serif',
                textShadow: '0 2px 6px rgba(0,0,0,0.55)',
              }}
            >
              {adminHeading}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-amber-500" />
            <span className="text-amber-400 text-lg">◆</span>
            <span className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-amber-500" />
          </div>
          <span className="inline-block text-amber-400 text-[11px] md:text-xs font-black tracking-[0.3em] mt-4">
            OUR CERTIFIED TEAM
          </span>
          <p
            className="text-white/90 font-bold mt-3"
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: 'clamp(0.85rem, 1.8vw, 1.125rem)',
              textShadow: '0 2px 6px rgba(0,0,0,0.55)',
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Staff row — circular with gold ring */}
        <div className="relative mt-12 flex flex-wrap justify-center gap-x-4 gap-y-10">
          {members.map((m) => (
            <div key={m.id} className="flex flex-col items-center text-center group transition-transform duration-300 ease-out hover:scale-110 cursor-pointer basis-[calc(50%-0.5rem)] md:basis-[calc(33.333%-0.667rem)] lg:basis-[calc(25%-0.75rem)] max-w-[240px]">
              <div className="relative">
                {/* Gold ring + glow */}
                <div
                  className="absolute -inset-1.5 rounded-full opacity-95 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      'conic-gradient(from 180deg at 50% 50%, #FFD700, #FFEB3B, #FFF59D, #FFD700, #FFC107, #FFD700)',
                    boxShadow: '0 0 18px rgba(255, 215, 0, 0.55)',
                  }}
                  aria-hidden
                />
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-[3px] ring-[#0C3290] shadow-2xl bg-slate-200">
                  {m.photo_url ? (
                    <Image
                      src={m.photo_url}
                      alt={m.name || 'staff'}
                      fill
                      sizes="(min-width: 1024px) 160px, (min-width: 768px) 33vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                      {'\u30D5\u30A9\u30C8\u672A\u8A2D\u5B9A'}
                    </div>
                  )}
                </div>
                {/* Trophy badge */}
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-b from-amber-400 to-amber-600 text-[#0C3290] text-[10px] md:text-xs font-black px-3 py-0.5 rounded-full shadow-lg ring-2 ring-white/90 whitespace-nowrap"
                >
                  {m.certifications || '\u8A8D\u5B9A\u30B9\u30BF\u30C3\u30D5'}
                </div>
              </div>

              <p
                className="text-white font-black mt-5 leading-tight"
                style={{
                  fontFamily: '"Noto Sans JP", sans-serif',
                  fontSize: 'clamp(0.95rem, 1.6vw, 1.125rem)',
                  textShadow: '0 2px 6px rgba(0,0,0,0.55)',
                }}
              >
                {m.name}
              </p>
              {m.role && (
                <p className="text-amber-300 text-[11px] md:text-xs font-bold mt-0.5 tracking-wide">
                  {m.role}
                </p>
              )}
              {m.bio && (
                <p className="text-white/70 text-[11px] md:text-xs leading-relaxed mt-2 max-w-[220px]">
                  {m.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
