'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { V3StoreData } from '@/lib/v3-types';
import { MAPS_API_KEY } from '@/lib/constants';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let mapsPromise: Promise<typeof google.maps> | null = null;
function loadGoogleMaps(): Promise<typeof google.maps> {
  if (mapsPromise) return mapsPromise;
  if (typeof window !== 'undefined' && window.google?.maps) {
    mapsPromise = Promise.resolve(window.google.maps);
    return mapsPromise;
  }
  mapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src*="maps.googleapis.com"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.maps) { resolve(window.google.maps); return; }
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
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

export default function StoreFinderBlock() {
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'detecting' | 'done' | 'denied'>('idle');
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [subCompanyMap, setSubCompanyMap] = useState<Record<string, { name: string; slug: string; storeIds: string[] }>>({});

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Fetch stores + sub-companies
  useEffect(() => {
    Promise.all([
      fetch('/api/v3/stores').then(r => r.json()),
      fetch('/api/v3/sub-companies').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([storeData, scData]: [V3StoreData[], { id: string; name: string; slug: string; stores: string[] }[]]) => {
      const scMap: Record<string, { name: string; slug: string; storeIds: string[] }> = {};
      for (const sc of (Array.isArray(scData) ? scData : [])) {
        scMap[sc.id] = { name: sc.name, slug: sc.slug, storeIds: sc.stores || [] };
      }
      setSubCompanyMap(scMap);
      setStores(storeData.map((s: V3StoreData) => ({ ...s, distance: null })));
      setStoresLoading(false);
    }).catch((err) => { console.error('Failed to fetch stores:', err); setStoresLoading(false); });
  }, []);

  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- intentional manual useCallback over Google Maps init; closure capture is desired
  const initMap = useCallback(() => {
    if (storesLoading || !mapRef.current || mapReady) return;
    loadGoogleMaps().then(maps => {
      const center = userPosRef.current || { lat: 36.5, lng: 137.5 };
      const zoom = userPosRef.current ? 13 : 6;

      const map = new maps.Map(mapRef.current!, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new maps.InfoWindow();

      if (userPosRef.current) {
        userMarkerRef.current = new maps.Marker({
          position: userPosRef.current, map, title: '現在地',
          icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
          zIndex: 999,
        });
      }

      stores.forEach(store => {
        const lat = store.lat;
        const lng = store.lng;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
        const marker = new maps.Marker({
          position: { lat, lng },
          map,
          title: store.store_name,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#c49a2a', fillOpacity: 1, strokeColor: '#0C3290', strokeWeight: 2 },
        });
        marker.addListener('click', () => {
          setSelectedStore(store.store_id);
          infoWindowRef.current?.setContent(`
            <div style="padding:4px 8px;min-width:180px">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${store.store_name}</div>
              <div style="font-size:11px;color:#666;margin-bottom:4px">${store.address}</div>
              <div style="font-size:11px;color:#666">${store.tel || ''}</div>
              <a href="${(() => { const scId = (store as V3StoreData & { sub_company_id?: string }).sub_company_id; return scId && subCompanyMap[scId] ? '/' + subCompanyMap[scId].slug : '/' + store.store_id + '/'; })()}" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#c49a2a;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold">この店舗を見る →</a>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
          map.panTo({ lat, lng });
          document.getElementById(`store-card-${store.store_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        markersRef.current.push(marker);
      });
      setMapReady(true);
    });
  }, [storesLoading, stores, mapReady]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (mapReady && userPos && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(userPos);
      mapInstanceRef.current.setZoom(13);
      if (!userMarkerRef.current) {
        const maps = window.google.maps;
        userMarkerRef.current = new maps.Marker({
          position: userPos, map: mapInstanceRef.current, title: '現在地',
          icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
          zIndex: 999,
        });
      }
    }
  }, [mapReady, userPos]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userPosRef.current = { lat: latitude, lng: longitude };
        setUserPos({ lat: latitude, lng: longitude });
        setGeoStatus('done');
        setStores(prev => {
          const sorted = prev.map(s => ({
            ...s,
            distance: s.lat && s.lng ? haversineKm(latitude, longitude, s.lat, s.lng) : null,
          }));
          sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
          return sorted;
        });
        if (mapInstanceRef.current) {
          const maps = window.google.maps;
          if (userMarkerRef.current) userMarkerRef.current.setMap(null);
          userMarkerRef.current = new maps.Marker({
            position: { lat: latitude, lng: longitude }, map: mapInstanceRef.current, title: '現在地',
            icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
            zIndex: 999,
          });
          mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setZoom(13);
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (!storesLoading && stores.length > 0 && geoStatus === 'idle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detectLocation triggers async geolocation; setState happens after user permission
      detectLocation();
    }
  }, [storesLoading, stores.length, geoStatus, detectLocation]);

  const handleStoreClick = (storeId: string) => {
    setSelectedStore(storeId);
    const store = stores.find(s => s.store_id === storeId);
    if (store && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: store.lat, lng: store.lng });
      mapInstanceRef.current.setZoom(13);
    }
  };

  return (
    <section id="store-finder" ref={mapSectionRef} className="bg-[#0C3290]">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>店舗検索</h2>
            <p className="text-white/40 text-xs mt-0.5">お近くのKeePer PRO SHOPを探す</p>
          </div>
          <div className="flex items-center gap-3">
            {geoStatus === 'idle' && (
              <button onClick={detectLocation} className="px-4 py-2 bg-amber-500 text-[#0C3290] text-xs font-bold rounded-lg hover:bg-amber-500 cursor-pointer">
                現在地から探す
              </button>
            )}
            {geoStatus === 'detecting' && <span className="text-white/40 text-xs">位置情報を取得中...</span>}
            {geoStatus === 'denied' && (
              <div className="flex items-center gap-3">
                <span className="text-red-400/70 text-xs">位置情報が取得できませんでした</span>
                <button onClick={detectLocation} className="px-4 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 cursor-pointer">
                  再試行
                </button>
              </div>
            )}
            {geoStatus === 'done' && <span className="text-emerald-400 text-xs font-semibold">現在地取得済み — 近い順に表示</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row" style={{ height: '500px' }}>
        <div className="flex-1 relative min-h-[250px] md:min-h-0">
          <div ref={mapRef} className="absolute inset-0" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0C3290]">
              {storesLoading
                ? <p className="text-white/40 text-sm">店舗データを読み込み中...</p>
                : <p className="text-white/40 text-sm">地図を読み込み中...</p>
              }
            </div>
          )}
        </div>

        <div className="w-full md:w-[380px] bg-[#0a0e14] border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
          <div className="px-4 py-3 border-b border-white/10 sticky top-0 bg-[#0a0e14] z-10">
            <p className="text-white/50 text-xs">{stores.length}件の店舗</p>
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
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {store.tel && <span className="text-white/40 text-xs">{store.tel}</span>}
                      {store.has_booth && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">ブース</span>}
                      {(() => { const scId = (store as V3StoreData & { sub_company_id?: string }).sub_company_id; return scId && subCompanyMap[scId] ? <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-semibold">{subCompanyMap[scId].name}</span> : null; })()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {store.distance !== null && (
                      <span className="text-amber-400 text-xs font-bold">
                        {store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}
                      </span>
                    )}
                    <Link href={(() => { const scId = (store as V3StoreData & { sub_company_id?: string }).sub_company_id; return scId && subCompanyMap[scId] ? `/${subCompanyMap[scId].slug}` : `/${store.store_id}/`; })()}
                      className="px-3 py-1.5 bg-amber-500 text-[#0C3290] text-[11px] font-bold rounded-md hover:bg-amber-500 transition-colors"
                      onClick={e => e.stopPropagation()}>
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
            {stores.length === 0 && !storesLoading && (
              <div className="px-4 py-12 text-center text-white/30 text-sm">店舗データがありません。</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
