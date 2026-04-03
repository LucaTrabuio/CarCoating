'use client';

import { StoreData } from '@/lib/types';

interface StoreMapProps {
  stores: StoreData[];
  selectedStore: StoreData | null;
  onSelect: (store: StoreData) => void;
}

export default function StoreMap({ stores, selectedStore, onSelect }: StoreMapProps) {
  if (stores.length === 0) return null;

  // Calculate center of all stores
  const centerLat = stores.reduce((sum, s) => sum + s.lat, 0) / stores.length;
  const centerLng = stores.reduce((sum, s) => sum + s.lng, 0) / stores.length;

  // Build Google Maps embed URL with markers for all stores
  const markers = stores.map(s => `markers=color:${selectedStore?.store_id === s.store_id ? '0xd97706' : '0x0f1c2e'}%7Clabel:${encodeURIComponent(s.store_name.charAt(0))}%7C${s.lat},${s.lng}`).join('&');
  const mapSrc = `https://maps.google.com/maps?q=${centerLat},${centerLng}&z=10&output=embed`;

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <iframe
          src={mapSrc}
          className="w-full h-[280px] border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title="店舗マップ"
        />
      </div>

      {/* Store pins as clickable cards overlaid below map */}
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
                {/* Pin icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {isSelected ? '✓' : '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm ${isSelected ? 'text-amber-700' : 'text-[#0f1c2e]'}`}>
                    {store.store_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{store.address}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-400">
                    <span>{store.business_hours}</span>
                    <span>{store.regular_holiday}</span>
                    {store.has_booth && <span className="text-amber-600 font-semibold">専用ブース</span>}
                    {store.parking_spaces > 0 && <span>駐車場{store.parking_spaces}台</span>}
                  </div>
                </div>
                {/* Map link */}
                {store.access_map_url && (
                  <a
                    href={store.access_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 text-[10px] text-slate-400 hover:text-amber-600 underline"
                  >
                    Google Map
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
