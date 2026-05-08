import Link from 'next/link';
import type { AccessConfig } from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import TrackedPhoneLink from '@/components/TrackedPhoneLink';
import SubCompanyStoreMap from '@/components/SubCompanyStoreMap';

interface AccessBlockProps {
  config: AccessConfig;
  store: V3StoreData;
  basePath?: string;
  allStores?: V3StoreData[];
}

interface NearbyStation {
  name: string;
  time: string;
}

export default function AccessBlock({ config, store, basePath, allStores }: AccessBlockProps) {
  let stations: NearbyStation[] = [];
  try {
    stations = JSON.parse(store.nearby_stations || '[]');
  } catch { /* empty */ }

  // When the store belongs to a multi-store sub-company, show the same
  // interactive multi-store map used on the sub-company landing page so the
  // access section reflects every sibling location rather than just this one.
  const siblingStores = allStores && allStores.length > 1 ? allStores : null;

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
          style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}
        >
          アクセス
        </h2>

        {config.show_map && siblingStores && (
          <div className="mb-8">
            <SubCompanyStoreMap
              stores={siblingStores.map(s => ({
                store_id: s.store_id,
                store_name: s.store_name,
                address: s.address,
                tel: s.tel,
                business_hours: s.business_hours,
                regular_holiday: s.regular_holiday,
                parking_spaces: s.parking_spaces,
                landmark: s.landmark,
                nearby_stations: s.nearby_stations,
                has_booth: s.has_booth,
                lat: s.lat,
                lng: s.lng,
              }))}
              groupName={`${siblingStores.length}店舗`}
              embedded
            />
          </div>
        )}

        {config.show_map && !siblingStores && store.lat !== 0 && store.lng !== 0 && (
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
