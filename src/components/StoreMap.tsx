'use client';

import { useEffect, useRef, useCallback } from 'react';
import { StoreData } from '@/lib/types';
import { MAPS_API_KEY } from '@/lib/constants';

interface StoreMapProps {
  stores: StoreData[];
  selectedStore: StoreData | null;
  onSelect: (store: StoreData) => void;
}

let mapsPromise: Promise<typeof google.maps> | null = null;

function loadGoogleMaps(): Promise<typeof google.maps> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve(window.google.maps); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => { mapsPromise = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export default function StoreMap({ stores, selectedStore, onSelect }: StoreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const storesRef = useRef(stores);
  const onSelectRef = useRef(onSelect);
  storesRef.current = stores;
  onSelectRef.current = onSelect;

  const updateMarkers = useCallback((selected: StoreData | null) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const currentStores = storesRef.current;
    const bounds = new google.maps.LatLngBounds();

    currentStores.forEach(store => {
      const isSelected = selected?.store_id === store.store_id;
      const position = { lat: store.lat, lng: store.lng };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        map,
        position,
        title: store.store_name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 14 : 10,
          fillColor: isSelected ? '#d97706' : '#0C3290',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: isSelected ? 10 : 1,
      });

      const infoContent = `<div style="padding:8px 4px;min-width:200px;font-family:sans-serif;">
        <div style="font-size:14px;font-weight:bold;color:${isSelected ? '#d97706' : '#0C3290'};margin-bottom:6px;">${store.store_name}</div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">${store.address}</div>
        ${store.tel ? `<div style="font-size:11px;color:#555;margin-bottom:4px;">📞 ${store.tel}</div>` : ''}
        ${store.email ? `<div style="font-size:11px;color:#555;margin-bottom:4px;">✉️ ${store.email}</div>` : ''}
        <div style="font-size:10px;color:#999;margin-bottom:4px;">🕐 ${store.business_hours} ｜ ${store.regular_holiday}</div>
        ${store.has_booth ? '<div style="font-size:10px;color:#d97706;font-weight:bold;">専用ブース完備</div>' : ''}
        ${store.parking_spaces > 0 ? `<div style="font-size:10px;color:#999;">駐車場 ${store.parking_spaces}台</div>` : ''}
      </div>`;

      marker.addListener('mouseover', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, marker);
        }
      });

      marker.addListener('mouseout', () => {
        if (infoWindowRef.current && !isSelected) {
          infoWindowRef.current.close();
        }
      });

      marker.addListener('click', () => {
        onSelectRef.current(store);
      });

      if (isSelected && infoWindowRef.current) {
        infoWindowRef.current.setContent(infoContent);
        infoWindowRef.current.open(map, marker);
      }

      markersRef.current.push(marker);
    });

    if (selected) {
      map.setCenter({ lat: selected.lat, lng: selected.lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || stores.length === 0) return;

    loadGoogleMaps().then(() => {
      if (mapInstanceRef.current) return;

      const map = new google.maps.Map(mapRef.current!, {
        center: { lat: 36.0, lng: 137.0 },
        zoom: 6,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'cooperative',
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      mapInstanceRef.current = map;
      updateMarkers(selectedStore);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  // Update on selection change
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers(selectedStore);
    }
  }, [selectedStore, updateMarkers]);

  return (
    <div className="space-y-3">
      <div ref={mapRef} className="rounded-xl overflow-hidden border border-slate-200 h-[380px]" />

      {!selectedStore && (
        <p className="text-[11px] text-slate-400 text-center">
          マップ上のピンまたは下の一覧をクリックして店舗を選択
        </p>
      )}

      <div className="grid grid-cols-1 gap-2">
        {stores.map(store => {
          const isSelected = selectedStore?.store_id === store.store_id;
          return (
            <button
              key={store.store_id}
              onClick={() => onSelect(store)}
              className={`w-full text-left rounded-xl p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-50 border-2 border-amber-500 shadow-md ring-2 ring-amber-200'
                  : 'bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isSelected ? 'bg-amber-500 text-[#0C3290]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {isSelected ? '✓' : '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm ${isSelected ? 'text-amber-700' : 'text-[#0C3290]'}`}>
                    {store.store_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{store.address}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-400">
                    <span>{store.business_hours}</span>
                    <span>{store.regular_holiday}</span>
                    {store.has_booth && <span className="text-blue-600 font-semibold">専用ブース</span>}
                    {store.parking_spaces > 0 && <span>駐車場{store.parking_spaces}台</span>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
