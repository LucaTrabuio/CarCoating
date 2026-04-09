'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface StoreLocation {
  store_id: string;
  store_name: string;
  address: string;
  tel: string;
  business_hours: string;
  regular_holiday: string;
  parking_spaces: number;
  landmark: string;
  nearby_stations: string;
  has_booth: boolean;
  lat: number;
  lng: number;
}

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

export default function SubCompanyStoreMap({ stores, groupName }: { stores: StoreLocation[]; groupName: string }) {
  const [sortedStores, setSortedStores] = useState<(StoreLocation & { distance: number | null })[]>(
    stores.map(s => ({ ...s, distance: null }))
  );
  const [geoStatus, setGeoStatus] = useState<'idle' | 'detecting' | 'done' | 'denied'>('idle');
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const initMap = useCallback(() => {
    if (!mapRef.current || mapReady || stores.length === 0) return;
    loadGoogleMaps().then(maps => {
      // Center on the midpoint of all stores
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

      // Fit bounds to show all stores
      const bounds = new maps.LatLngBounds();
      stores.forEach(store => {
        if (!store.lat || !store.lng) return;
        bounds.extend({ lat: store.lat, lng: store.lng });

        const marker = new maps.Marker({
          position: { lat: store.lat, lng: store.lng },
          map,
          title: store.store_name,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#c49a2a', fillOpacity: 1, strokeColor: '#0f1c2e', strokeWeight: 2 },
        });

        marker.addListener('click', () => {
          setSelectedStore(store.store_id);
          infoWindowRef.current?.setContent(`
            <div style="padding:4px 8px;min-width:200px">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${store.store_name}</div>
              <div style="font-size:11px;color:#666;margin-bottom:2px">${store.address}</div>
              <div style="font-size:11px;color:#666">${store.tel || ''}</div>
              <div style="font-size:11px;color:#999;margin-top:2px">${store.business_hours}</div>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
          document.getElementById(`sc-store-${store.store_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        markersRef.current.push(marker);
      });

      if (stores.length > 1) {
        map.fitBounds(bounds, 50);
      }
      setMapReady(true);
    });
  }, [stores, mapReady]);

  useEffect(() => { initMap(); }, [initMap]);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setGeoStatus('done');

        // Calculate distances and sort
        const withDist = stores.map(s => ({
          ...s,
          distance: haversineKm(userLat, userLng, s.lat, s.lng),
        }));
        withDist.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        setSortedStores(withDist);

        // Add user marker
        if (mapInstanceRef.current && !userMarkerRef.current) {
          const maps = window.google.maps;
          userMarkerRef.current = new maps.Marker({
            position: { lat: userLat, lng: userLng },
            map: mapInstanceRef.current,
            title: '現在地',
            icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
            zIndex: 999,
          });
          // Refit bounds to include user
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

  // Auto-detect on mount
  useEffect(() => {
    if (geoStatus === 'idle' && navigator.geolocation) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            店舗一覧・アクセス
          </h2>
          <p className="text-sm text-gray-500 mt-1">{groupName} — {stores.length}店舗</p>
        </div>

        {/* Map + Store list layout */}
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white mb-6">
          <div className="flex flex-col md:flex-row" style={{ height: '500px' }}>
            {/* Map */}
            <div ref={mapRef} className="flex-1 min-h-[300px]" />

            {/* Store list sidebar */}
            <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto bg-white">
              <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-center justify-between">
                <p className="text-xs text-gray-500">{sortedStores.length}店舗</p>
                <button
                  onClick={detectLocation}
                  disabled={geoStatus === 'detecting'}
                  className="text-xs text-amber-500 font-semibold hover:underline disabled:opacity-50"
                >
                  {geoStatus === 'detecting' ? '検出中...' : geoStatus === 'done' ? '再検出' : '📍 現在地から探す'}
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {sortedStores.map(store => {
                  let stations: { name: string; time: string }[] = [];
                  try { stations = JSON.parse(store.nearby_stations || '[]'); } catch { /* */ }
                  return (
                    <div
                      key={store.store_id}
                      id={`sc-store-${store.store_id}`}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedStore === store.store_id
                          ? 'bg-amber-50 border-l-2 border-l-amber-500'
                          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                      }`}
                      onClick={() => {
                        setSelectedStore(store.store_id);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.panTo({ lat: store.lat, lng: store.lng });
                          mapInstanceRef.current.setZoom(14);
                        }
                        // Open info window
                        const idx = stores.findIndex(s => s.store_id === store.store_id);
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
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-[#0f1c2e]">{store.store_name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            {store.tel && <span>{store.tel}</span>}
                            {store.has_booth && <span className="text-amber-500 font-semibold">ブース有</span>}
                          </div>
                          {stations.length > 0 && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {stations.map(s => `${s.name} ${s.time}`).join(' / ')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {store.distance !== null && (
                            <span className="text-amber-500 text-xs font-bold">
                              {store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}
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
  );
}
