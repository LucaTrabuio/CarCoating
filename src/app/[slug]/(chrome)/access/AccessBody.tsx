import type { V3StoreData } from '@/lib/v3-types';

function parseStations(raw: string): { name: string; time: string }[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function StoreAccessCard({ store }: { store: V3StoreData }) {
  const stations = parseStations(store.nearby_stations);
  return (
    <div className="grid md:grid-cols-2 gap-6 bg-white rounded-xl overflow-hidden border border-gray-200">
      <div className="aspect-[4/3] md:aspect-auto">
        {(store.lat && store.lng) ? (
          <iframe
            src={`https://maps.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed`}
            width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
            referrerPolicy="no-referrer-when-downgrade" title={`${store.store_name} 地図`}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">地図情報なし</div>
        )}
      </div>
      <div className="p-5 space-y-3 text-sm">
        <h3 className="text-lg font-bold text-[#0C3290]" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>{store.store_name}</h3>
        <div><span className="text-xs text-gray-400 block mb-0.5">住所</span>{store.postal_code && `〒${store.postal_code} `}{store.address}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-xs text-gray-400 block mb-0.5">営業時間</span>{store.business_hours || '—'}</div>
          <div><span className="text-xs text-gray-400 block mb-0.5">定休日</span>{store.regular_holiday || '年中無休'}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {store.tel && <div><span className="text-xs text-gray-400 block mb-0.5">電話番号</span><a href={`tel:${store.tel}`} className="font-bold text-amber-500">{store.tel}</a></div>}
          {store.email && <div><span className="text-xs text-gray-400 block mb-0.5">メール</span>{store.email}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-xs text-gray-400 block mb-0.5">駐車場</span>{store.parking_spaces}台</div>
          <div><span className="text-xs text-gray-400 block mb-0.5">認定ブース</span>{store.has_booth ? 'あり' : 'なし'}</div>
        </div>
        {stations.length > 0 && (
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">最寄り駅</span>
            {stations.map((s, i) => <div key={i} className="text-xs">{s.name}（{s.time}）</div>)}
          </div>
        )}
        {store.landmark && (
          <div><span className="text-xs text-gray-400 block mb-0.5">目印</span>{store.landmark}</div>
        )}
      </div>
    </div>
  );
}

export function SingleStoreAccess({ store }: { store: V3StoreData }) {
  return (
    <main>
      <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>店舗情報・アクセス</h1>
        <p className="text-white/40 text-sm mt-1">{store.store_name}</p>
      </section>
      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <StoreAccessCard store={store} />
        </div>
      </section>
    </main>
  );
}
