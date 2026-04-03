import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoreByIdAsync, getBaseUrl, getAllStoresAsync, getNearbyStations } from '@/lib/store-data';
import StoreMap from '@/components/StoreMap';

interface AccessPageProps {
  params: Promise<{ storeId: string }>;
}

export default async function StoreAccessPage({ params }: AccessPageProps) {
  const { storeId } = await params;
  const baseUrl = await getBaseUrl();
  const [store, allStores] = await Promise.all([
    getStoreByIdAsync(storeId, baseUrl),
    getAllStoresAsync(baseUrl),
  ]);

  if (!store) notFound();

  const nearbyStations = getNearbyStations(store);
  const otherStores = allStores.filter((s) => s.store_id !== storeId);

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1
          className="text-white text-xl font-bold"
          style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
        >
          アクセス・店舗情報
        </h1>
        <p className="text-white/50 text-sm mt-1">{store.store_name}</p>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[800px] mx-auto">
          {/* Store details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2
              className="text-lg font-bold text-[#0f1c2e] mb-4"
              style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
            >
              {store.store_name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-1">住所</p>
                <p className="text-gray-700">{store.postal_code && `〒${store.postal_code} `}{store.address}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">営業時間</p>
                <p className="text-gray-700">{store.business_hours}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">定休日</p>
                <p className="text-gray-700">{store.regular_holiday}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">電話番号</p>
                <p className="text-gray-700">
                  <a href={`tel:${store.tel}`} className="text-amber-600 hover:underline">{store.tel}</a>
                </p>
              </div>
              {store.parking_spaces > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">駐車場</p>
                  <p className="text-gray-700">{store.parking_spaces}台</p>
                </div>
              )}
              {store.has_booth && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">設備</p>
                  <p className="text-amber-600 font-semibold">専用ブース完備</p>
                </div>
              )}
              {store.landmark && (
                <div className="sm:col-span-2">
                  <p className="text-gray-400 text-xs mb-1">目印</p>
                  <p className="text-gray-700">{store.landmark}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nearby stations */}
          {nearbyStations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
              <h3 className="text-base font-bold text-[#0f1c2e] mb-3">最寄り駅</h3>
              <div className="space-y-2">
                {nearbyStations.map((station, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">&#128646;</span>
                    <span className="font-semibold text-gray-700">{station.name}</span>
                    <span className="text-gray-400">{station.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google Maps embed */}
          <div className="mb-8">
            <h3 className="text-base font-bold text-[#0f1c2e] mb-3">地図</h3>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <iframe
                src={`https://www.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed`}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${store.store_name}の地図`}
              />
            </div>
          </div>

          {/* Other stores */}
          {otherStores.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-base font-bold text-[#0f1c2e] mb-4">他の店舗</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {otherStores.map((other) => (
                  <Link
                    key={other.store_id}
                    href={`/${other.store_id}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-400 hover:shadow-md transition-all"
                  >
                    <p className="font-bold text-sm text-[#0f1c2e]">{other.store_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{other.address}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
