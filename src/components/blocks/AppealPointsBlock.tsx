import type { AppealPointsConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import type { MasterAppealPoint } from '@/lib/master-data';

interface AppealPointsBlockProps {
  config: AppealPointsConfig;
  store: V3StoreData;
  appealPointsMaster?: Record<string, MasterAppealPoint>;
}

// Inline fallback — only used when appealPointsMaster prop is not passed
const FALLBACK_MASTER: Record<string, { label: string; icon: string; description: string }> = {
  booth: { label: 'コーティング専用ブース完備', icon: '🏢', description: '天候に左右されない専用施工環境' },
  certified: { label: '技術認定スタッフ在籍', icon: '👨\u200d🔧', description: 'KeePer技術資格保有のプロが対応' },
  warranty: { label: '施工保証付き', icon: '🛡️', description: '安心の施工品質保証' },
  quick: { label: '即日施工対応', icon: '⏱️', description: '当日のご予約にも可能な限り対応' },
  shuttle: { label: '送迎サービスあり', icon: '🚗', description: '施工中のお待ち時間に送迎サービス' },
  loaner: { label: '代車無料', icon: '🔑', description: '施工中は無料で代車をご利用いただけます' },
  card: { label: 'カード・電子マネー対応', icon: '💳', description: '各種お支払い方法に対応' },
  weekend: { label: '土日祝日営業', icon: '📅', description: 'お仕事帰りや休日にもご来店いただけます' },
};

export default function AppealPointsBlock({ config, store, appealPointsMaster }: AppealPointsBlockProps) {
  const masterData = appealPointsMaster || FALLBACK_MASTER;

  // Read selected IDs from store or config
  let selectedIds = config.selected_ids;
  if (selectedIds.length === 0 && store.appeal_points) {
    try {
      selectedIds = JSON.parse(store.appeal_points);
    } catch { /* empty */ }
  }

  const points = selectedIds
    .map(id => {
      const master = masterData[id];
      if (!master) return null;
      return { id, ...master };
    })
    .filter(Boolean);

  if (points.length === 0) return null;

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[900px] mx-auto">
        <h2
          className="text-xl md:text-2xl font-bold text-[#0f1c2e] text-center mb-8"
          style={{ fontFamily: '"Noto Serif JP", serif' }}
        >
          当店のポイント
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {points.map(point => {
            if (!point) return null;
            return (
              <div
                key={point.id}
                className="bg-slate-50 rounded-xl p-4 text-center hover:bg-slate-100 transition-colors cursor-default"
              >
                <div className="text-2xl mb-2">{point.icon}</div>
                <h3 className="font-bold text-sm text-[#0f1c2e] mb-1">{point.label}</h3>
                {config.show_descriptions && (
                  <p className="text-xs text-slate-500">{point.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
