'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { V3StoreData } from '@/lib/v3-types';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Singleton Google Maps loader
let mapsPromise: Promise<typeof google.maps> | null = null;
function loadGoogleMaps(): Promise<typeof google.maps> {
  if (mapsPromise) return mapsPromise;
  if (typeof window !== 'undefined' && window.google?.maps) {
    mapsPromise = Promise.resolve(window.google.maps);
    return mapsPromise;
  }
  mapsPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      const check = () => {
        if (window.google?.maps) resolve(window.google.maps);
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&language=ja`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

interface StoreWithDistance extends V3StoreData {
  distance: number | null;
}

export default function V3StoreFinderPage() {
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'detecting' | 'done' | 'denied'>('idle');
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Fetch stores
  useEffect(() => {
    fetch('/api/v3/stores')
      .then(res => res.json())
      .then((data: V3StoreData[]) => {
        const withDist: StoreWithDistance[] = data.map(s => ({ ...s, distance: null }));
        setStores(withDist);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Init map once stores are loaded
  useEffect(() => {
    if (loading || stores.length === 0 || !mapRef.current || mapReady) return;
    loadGoogleMaps().then(maps => {
      const map = new maps.Map(mapRef.current!, {
        center: { lat: 36.5, lng: 137.5 }, // center of Japan
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new maps.InfoWindow();

      // Add store markers
      stores.forEach(store => {
        if (!store.lat || !store.lng) return;
        const marker = new maps.Marker({
          position: { lat: store.lat, lng: store.lng },
          map,
          title: store.store_name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#0f1c2e',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => {
          setSelectedStore(store.store_id);
          infoWindowRef.current?.setContent(`
            <div style="padding:4px 8px;min-width:180px">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${store.store_name}</div>
              <div style="font-size:11px;color:#666;margin-bottom:4px">${store.address}</div>
              <div style="font-size:11px;color:#666">${store.tel || ''}</div>
              <a href="/v3/${store.store_id}/" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#f59e0b;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold">
                この店舗を見る →
              </a>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
          map.panTo({ lat: store.lat, lng: store.lng });

          // Scroll the list item into view
          const el = document.getElementById(`store-card-${store.store_id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        markersRef.current.push(marker);
      });

      setMapReady(true);
    });
  }, [loading, stores, mapReady]);

  // Request geolocation
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        setGeoStatus('done');

        // Sort stores by distance
        setStores(prev => {
          const sorted = prev.map(s => ({
            ...s,
            distance: s.lat && s.lng ? haversineKm(latitude, longitude, s.lat, s.lng) : null,
          }));
          sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
          return sorted;
        });

        // Add user marker and recenter map
        if (mapInstanceRef.current) {
          const maps = window.google.maps;
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: mapInstanceRef.current,
            title: '現在地',
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
            zIndex: 999,
          });
          mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setZoom(10);
        }
      },
      () => {
        setGeoStatus('denied');
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    if (!loading && stores.length > 0 && geoStatus === 'idle') {
      detectLocation();
    }
  }, [loading, stores.length, geoStatus, detectLocation]);

  // Highlight selected store on map
  const handleStoreClick = (storeId: string) => {
    setSelectedStore(storeId);
    const store = stores.find(s => s.store_id === storeId);
    if (store && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: store.lat, lng: store.lng });
      mapInstanceRef.current.setZoom(13);
      // Trigger marker click
      const idx = stores.findIndex(s => s.store_id === storeId);
      const marker = markersRef.current[idx];
      if (marker) google.maps.event.trigger(marker, 'click');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1c2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">店舗データを読み込み中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1c2e]">
      {/* Header */}
      <div className="bg-[#0f1c2e] border-b border-white/10 px-5 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <div className="text-amber-500 text-xs font-semibold">KeePer PRO SHOP</div>
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>店舗検索</h1>
          </div>
          <div className="flex items-center gap-3">
            {geoStatus === 'detecting' && (
              <span className="text-white/40 text-xs">位置情報を取得中...</span>
            )}
            {geoStatus === 'denied' && (
              <button
                onClick={detectLocation}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 cursor-pointer"
              >
                現在地を取得
              </button>
            )}
            {geoStatus === 'done' && userPos && (
              <span className="text-emerald-400 text-xs font-semibold">現在地取得済み</span>
            )}
          </div>
        </div>
      </div>

      {/* Map + List layout */}
      <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 72px)' }}>
        {/* Map */}
        <div className="flex-1 relative min-h-[300px] md:min-h-0">
          <div ref={mapRef} className="absolute inset-0" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1c2e]">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Store list sidebar */}
        <div className="w-full md:w-[380px] bg-[#0f1c2e] border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/10 sticky top-0 bg-[#0f1c2e] z-10">
            <p className="text-white/60 text-xs">
              {stores.length}件の店舗
              {geoStatus === 'done' && ' — 近い順に表示'}
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {stores.map(store => (
              <div
                key={store.store_id}
                id={`store-card-${store.store_id}`}
                className={`px-4 py-4 cursor-pointer transition-colors ${
                  selectedStore === store.store_id
                    ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                    : 'hover:bg-white/5 border-l-2 border-l-transparent'
                }`}
                onClick={() => handleStoreClick(store.store_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm">{store.store_name}</h3>
                    <p className="text-white/40 text-xs mt-0.5">{store.prefecture} {store.city}</p>
                    <p className="text-white/30 text-xs mt-1 truncate">{store.address}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {store.tel && <span className="text-white/40 text-xs">{store.tel}</span>}
                      {store.has_booth && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">ブース</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {store.distance !== null && (
                      <span className="text-amber-400 text-xs font-bold">
                        {store.distance < 1
                          ? `${Math.round(store.distance * 1000)}m`
                          : `${store.distance.toFixed(1)}km`}
                      </span>
                    )}
                    <Link
                      href={`/v3/${store.store_id}/`}
                      className="px-3 py-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-md hover:bg-amber-600 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      詳細 →
                    </Link>
                  </div>
                </div>
                {store.campaign_title && (
                  <div className="mt-2 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded font-semibold">
                    {store.campaign_title} ｜ 最大{store.discount_rate}%OFF
                  </div>
                )}
              </div>
            ))}
          </div>

          {stores.length === 0 && (
            <div className="px-4 py-12 text-center text-white/30 text-sm">
              店舗データがありません。<br />管理画面からCSVをインポートしてください。
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
