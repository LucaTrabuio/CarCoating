import Link from 'next/link';
import type { AccessConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import TrackedPhoneLink from '@/components/TrackedPhoneLink';

interface AccessBlockProps {
  config: AccessConfig;
  store: V3StoreData;
  basePath?: string;
}

interface NearbyStation {
  name: string;
  time: string;
}

export default function AccessBlock({ config, store, basePath }: AccessBlockProps) {
  let stations: NearbyStation[] = [];
  try {
    stations = JSON.parse(store.nearby_stations || '[]');
  } catch { /* empty */ }

  // Build parent sub-company link for "see other stores"
  const subCompanyHref =
    config.show_nearby_stores && store.sub_company_id && basePath
      ? basePath.split('/').slice(0, -1).join('/') || '/'
      : null;

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[900px] mx-auto">
        <h2
          className="text-3xl md:text-5xl font-black tracking-tight text-[#0C3290] text-center mb-8"
          style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
        >
          アクセス
        </h2>

        {config.show_map && store.lat !== 0 && store.lng !== 0 && (
          <div className="rounded-xl overflow-hidden mb-8">
            <iframe
              src={`https://www.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed`}
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${store.store_name}の地図`}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <InfoRow label="住所" value={store.address} />
          <InfoRow label="営業時間" value={store.business_hours} />
          <InfoRow label="定休日" value={store.regular_holiday} />
          <InfoRow label="電話番号">
            <TrackedPhoneLink tel={store.tel} storeId={store.store_id} className="text-amber-500 hover:underline">
              {store.tel}
            </TrackedPhoneLink>
          </InfoRow>
          {store.parking_spaces > 0 && (
            <InfoRow label="駐車場" value={`${store.parking_spaces}台`} />
          )}
          {stations.length > 0 && (
            <InfoRow
              label="最寄り駅"
              value={stations.map(s => `${s.name}（${s.time}）`).join('、')}
            />
          )}
          {store.landmark && (
            <InfoRow label="目印" value={store.landmark} />
          )}
        </div>

        {/* Nearby stores link */}
        {subCompanyHref && (
          <div className="mt-8 text-center">
            <Link
              href={subCompanyHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-[#0C3290] hover:border-amber-500 hover:bg-amber-50 transition-colors"
            >
              <span aria-hidden="true">&#128205;</span>
              他の店舗を見る
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  if (!value && !children) return null;
  return (
    <div className="flex gap-3 py-3 border-b border-slate-200">
      <span className="text-xs font-bold text-slate-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#0C3290]">{children ?? value}</span>
    </div>
  );
}
