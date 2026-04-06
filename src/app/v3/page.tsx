'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { V3StoreData } from '@/lib/v3-types';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function V3GeoRedirectPage() {
  const router = useRouter();
  const [stores, setStores] = useState<V3StoreData[]>([]);
  const [status, setStatus] = useState<'detecting' | 'denied' | 'error' | 'loading'>('loading');

  useEffect(() => {
    fetch('/api/v3/stores')
      .then(res => res.json())
      .then((data: V3StoreData[]) => {
        setStores(data);
        if (data.length === 0) {
          setStatus('error');
          return;
        }
        setStatus('detecting');
        if (!navigator.geolocation) {
          setStatus('denied');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            let nearest = data[0];
            let minDist = Infinity;
            for (const store of data) {
              if (!store.lat || !store.lng) continue;
              const dist = haversineKm(latitude, longitude, store.lat, store.lng);
              if (dist < minDist) {
                minDist = dist;
                nearest = store;
              }
            }
            router.replace(`/v3/${nearest.store_id}/`);
          },
          () => {
            setStatus('denied');
          },
          { timeout: 5000, maximumAge: 300000 }
        );
      })
      .catch(() => setStatus('error'));
  }, [router]);

  if (status === 'loading' || status === 'detecting') {
    return (
      <main className="min-h-screen bg-[#0f1c2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">
            {status === 'loading' ? '店舗データを読み込み中...' : '現在地を取得中...'}
          </p>
          <p className="text-white/40 text-xs mt-1">位置情報の許可を求められた場合は「許可」を選択してください</p>
        </div>
      </main>
    );
  }

  // Fallback: show store picker
  return (
    <main className="min-h-screen bg-[#0f1c2e]">
      <div className="max-w-[900px] mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <div className="text-amber-500 text-sm font-semibold mb-2">KeePer PRO SHOP</div>
          <h1 className="text-white text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            店舗を選択
          </h1>
          <p className="text-white/40 text-sm">
            {status === 'denied'
              ? '位置情報が取得できませんでした。店舗を選択してください。'
              : '店舗データの取得に失敗しました。'}
          </p>
        </div>

        {stores.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(store => (
              <Link
                key={store.store_id}
                href={`/v3/${store.store_id}/`}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all group"
              >
                <h2 className="text-white font-bold text-lg group-hover:text-amber-400 transition-colors">
                  {store.store_name}
                </h2>
                <p className="text-white/40 text-xs mt-0.5">{store.prefecture} {store.city}</p>
                <div className="text-white/50 text-xs mt-2 space-y-1">
                  <div>{store.address}</div>
                  {store.tel && <div>{store.tel}</div>}
                  <div>{store.business_hours}</div>
                </div>
                {store.campaign_title && (
                  <div className="mt-3 text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1.5 rounded font-semibold">
                    {store.campaign_title} ｜ 最大{store.discount_rate}%OFF
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/40 text-sm">
            店舗データがありません。管理画面からCSVをインポートしてください。
          </div>
        )}
      </div>
    </main>
  );
}
