import { coatingTiers } from '@/data/coating-tiers';

const SERVICE_GROUPS = [
  { label: 'FLAGSHIP', ids: ['ex-premium', 'ex'], color: 'from-amber-500 to-amber-500' },
  { label: 'PREMIUM', ids: ['dia2-premium', 'dia2'], color: 'from-[#0C3290] to-slate-700' },
  { label: 'STANDARD', ids: ['diamond-premium', 'diamond'], color: 'from-slate-600 to-slate-500' },
  { label: 'ENTRY', ids: ['fresh', 'crystal'], color: 'from-slate-400 to-slate-300' },
];

export default function ServiceMenuBlock() {
  return (
    <section id="services" className="py-16 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティングメニュー</h2>
          <p className="text-sm text-gray-400 mt-2">全8コースのKeePer コーティング。あなたの目的に合った最適なコースをお選びください。</p>
        </div>

        <div className="space-y-6">
          {SERVICE_GROUPS.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded bg-gradient-to-r ${group.color} text-white`}>{group.label}</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {group.ids.map(id => {
                  const tier = coatingTiers.find(t => t.id === id);
                  if (!tier) return null;
                  return (
                    <a key={id} href="#store-finder" className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-[#0C3290] text-base">
                            {tier.name}
                            {tier.is_popular && <span className="text-[10px] text-blue-600 font-bold ml-2 px-1.5 py-0.5 bg-blue-50 rounded">人気</span>}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">{tier.tagline}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <span className="inline-block px-3 py-1.5 bg-amber-500 text-[#0C3290] text-xs font-bold rounded-lg hover:bg-amber-500 transition-colors">
                            店舗を探す →
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>{tier.durability_years}持続</span>
                        <span>{tier.application_time}</span>
                        <span>艶 {tier.gloss_rating} / 5</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 mb-4">各コースの詳細・技術解説・サイズ別料金表は店舗ページからご確認いただけます。</p>
        </div>
      </div>
    </section>
  );
}
