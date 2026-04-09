import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getV3StoreById, getAllV3Stores } from '@/lib/firebase-stores';

export default async function V3AccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store || !store.is_active) notFound();

  const allStores = await getAllV3Stores();
  const otherStores = allStores.filter(s => s.store_id !== storeId);
  const stations: { name: string; time: string }[] = (() => {
    try { const parsed = JSON.parse(store.nearby_stations || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  })();

  return (
    <main>
      <section className="bg-[#0f1c2e] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>店舗情報・アクセス</h1>
        <p className="text-white/40 text-sm mt-1">{store.store_name}</p>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-2 gap-8">
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
            <iframe
              src={`https://maps.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed`}
              width="100%" height="400" style={{ border: 0 }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title={`${store.store_name} 地図`}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#0f1c2e]">{store.store_name}</h2>
            <div className="space-y-3 text-sm">
              <div><span className="text-xs text-gray-400 block mb-0.5">住所</span>{store.postal_code && `〒${store.postal_code} `}{store.address}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-gray-400 block mb-0.5">営業時間</span>{store.business_hours || '—'}</div>
                <div><span className="text-xs text-gray-400 block mb-0.5">定休日</span>{store.regular_holiday}</div>
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
                  {stations.map((s, i) => <div key={i}>{s.name}（{s.time}）</div>)}
                </div>
              )}
              {store.landmark && (
                <div><span className="text-xs text-gray-400 block mb-0.5">目印</span>{store.landmark}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {otherStores.length > 0 && (
        <section className="py-10 px-5 bg-gray-50">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>他の店舗</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {otherStores.map(s => (
                <Link key={s.store_id} href={`/${s.store_id}/`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all">
                  <h3 className="font-bold text-[#0f1c2e]">{s.store_name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{s.prefecture} {s.city}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.address}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
