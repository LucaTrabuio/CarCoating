'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { V3StoreData } from '@/lib/v3-types';
import ReservationForm from './ReservationForm';

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

export default function BookingStoreSelector({ stores, groupName }: { stores: V3StoreData[]; groupName: string }) {
  const [sortedStores, setSortedStores] = useState<StoreWithDistance[]>(
    stores.map(s => ({ ...s, distance: null }))
  );
  const [geoStatus, setGeoStatus] = useState<'idle' | 'detecting' | 'done' | 'denied'>('idle');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const selectedStore = stores.find(s => s.store_id === selectedStoreId) ?? null;

  const selectStore = useCallback((storeId: string) => {
    setSelectedStoreId(storeId);
    // Scroll to the form after a short delay for render
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || mapReady || stores.length === 0) return;
    loadGoogleMaps().then(maps => {
      const avgLat = stores.reduce((sum, s) => sum + s.lat, 0) / stores.length;
      const avgLng = stores.reduce((sum, s) => sum + s.lng, 0) / stores.length;

      const map = new maps.Map(mapRef.current!, {
        center: { lat: avgLat, lng: avgLng },
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new maps.InfoWindow();

      const bounds = new maps.LatLngBounds();
      stores.forEach(store => {
        if (!store.lat || !store.lng) return;
        bounds.extend({ lat: store.lat, lng: store.lng });

        const marker = new maps.Marker({
          position: { lat: store.lat, lng: store.lng },
          map,
          title: store.store_name,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#c49a2a', fillOpacity: 1, strokeColor: '#0C3290', strokeWeight: 2 },
        });

        marker.addListener('click', () => {
          selectStore(store.store_id);
          infoWindowRef.current?.setContent(`
            <div style="padding:4px 8px;min-width:200px">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${store.store_name}</div>
              <div style="font-size:11px;color:#666;margin-bottom:2px">${store.address}</div>
              <div style="font-size:11px;color:#666">${store.tel || ''}</div>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
          document.getElementById(`bs-store-${store.store_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        markersRef.current.push(marker);
      });

      if (stores.length > 1) map.fitBounds(bounds, 50);
      setMapReady(true);
    });
  }, [stores, mapReady, selectStore]);

  useEffect(() => { initMap(); }, [initMap]);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setGeoStatus('done');
        const withDist = stores.map(s => ({
          ...s,
          distance: haversineKm(userLat, userLng, s.lat, s.lng),
        }));
        withDist.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        setSortedStores(withDist);

        if (mapInstanceRef.current && !userMarkerRef.current) {
          const maps = window.google.maps;
          userMarkerRef.current = new maps.Marker({
            position: { lat: userLat, lng: userLng },
            map: mapInstanceRef.current,
            title: '現在地',
            icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
            zIndex: 999,
          });
          const bounds = new maps.LatLngBounds();
          bounds.extend({ lat: userLat, lng: userLng });
          stores.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
          mapInstanceRef.current.fitBounds(bounds, 50);
        }
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    if (geoStatus === 'idle' && navigator.geolocation) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function panToStore(storeId: string) {
    const store = stores.find(s => s.store_id === storeId);
    if (!store || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({ lat: store.lat, lng: store.lng });
    mapInstanceRef.current.setZoom(14);
    const idx = stores.findIndex(s => s.store_id === storeId);
    if (idx >= 0 && markersRef.current[idx] && infoWindowRef.current) {
      infoWindowRef.current.setContent(`
        <div style="padding:4px 8px;min-width:200px">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${store.store_name}</div>
          <div style="font-size:11px;color:#666">${store.address}</div>
          <div style="font-size:11px;color:#666">${store.tel}</div>
        </div>
      `);
      infoWindowRef.current.open(mapInstanceRef.current, markersRef.current[idx]);
    }
  }

  return (
    <>
      {/* Store selector: map + list */}
      <section className="py-6 px-5 bg-slate-50">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              店舗を選択してください
            </h2>
            <p className="text-xs text-gray-500 mt-1">{groupName} — {stores.length}店舗</p>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
            <div className="flex flex-col md:flex-row" style={{ height: '420px' }}>
              {/* Map */}
              <div ref={mapRef} className="flex-1 min-h-[250px]" />

              {/* Store list sidebar */}
              <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto bg-white">
                <div className="px-4 py-2.5 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-center justify-between">
                  <p className="text-xs text-gray-500">{sortedStores.length}店舗</p>
                  <button
                    onClick={detectLocation}
                    disabled={geoStatus === 'detecting'}
                    className="text-xs text-amber-500 font-semibold hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {geoStatus === 'detecting' ? '検出中...' : geoStatus === 'done' ? '再検出' : '📍 現在地から探す'}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedStores.map(store => {
                    const isSelected = selectedStoreId === store.store_id;
                    return (
                      <div
                        key={store.store_id}
                        id={`bs-store-${store.store_id}`}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-50 border-l-2 border-l-amber-500'
                            : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                        }`}
                        onClick={() => {
                          selectStore(store.store_id);
                          panToStore(store.store_id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-[#0C3290]">{store.store_name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              {store.tel && <span>{store.tel}</span>}
                              {store.has_booth && <span className="text-amber-500 font-semibold">ブース有</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {store.distance !== null && (
                              <span className="text-amber-500 text-xs font-bold">
                                {store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[9px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded font-bold">
                                選択中
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reservation form for selected store */}
      <div ref={formRef}>
        {selectedStore ? (
          <div>
            <div className="bg-white border-b border-gray-200 py-3 px-5 sticky top-14 z-20 shadow-sm">
              <div className="max-w-[700px] mx-auto flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0C3290] text-sm">{selectedStore.store_name}</div>
                  <div className="text-xs text-gray-500">{selectedStore.address}</div>
                </div>
                <button
                  onClick={() => { setSelectedStoreId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="text-xs text-amber-600 font-semibold hover:underline cursor-pointer"
                >
                  店舗を変更
                </button>
              </div>
            </div>
            <ReservationForm key={selectedStore.store_id} store={selectedStore} />
          </div>
        ) : (
          <div className="py-16 px-5 text-center">
            <div className="text-4xl opacity-20 mb-3">🏪</div>
            <p className="text-sm text-gray-400">上のマップから店舗を選択すると、予約フォームが表示されます。</p>
          </div>
        )}
      </div>
    </>
  );
}
