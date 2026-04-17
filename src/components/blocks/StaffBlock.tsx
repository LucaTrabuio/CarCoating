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

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-[#0C3290] text-3xl md:text-5xl font-black tracking-tight" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
            {config.heading || '\u30B9\u30BF\u30C3\u30D5\u7D39\u4ECB'}
          </h2>
          {config.subheading && (
            <p className="text-slate-500 text-sm md:text-base mt-3">{config.subheading}</p>
          )}
          <div className="w-12 h-1 bg-amber-500 mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-slate-50 rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-sm flex flex-col"
            >
              <div className="aspect-[4/5] bg-slate-200 relative overflow-hidden">
                {m.photo_url ? (
                  <Image
                    src={m.photo_url}
                    alt={m.name || 'staff'}
                    fill
                    sizes="(min-width: 1024px) 260px, (min-width: 768px) 33vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                    {'\u30D5\u30A9\u30C8\u672A\u8A2D\u5B9A'}
                  </div>
                )}
                {m.certifications && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-[#0C3290] text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                    {m.certifications}
                  </span>
                )}
              </div>
              <div className="p-3 md:p-4 flex flex-col gap-1">
                <p className="text-[#0C3290] text-base md:text-lg font-black leading-tight">
                  {m.name}
                </p>
                {m.role && (
                  <p className="text-slate-500 text-xs md:text-sm font-semibold">{m.role}</p>
                )}
                {m.bio && (
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed mt-1">{m.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
