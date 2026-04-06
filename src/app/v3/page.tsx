'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { V3StoreData } from '@/lib/v3-types';
import { coatingTiers } from '@/data/coating-tiers';
import { blogArticles } from '@/data/blog-articles';
import { news, CATEGORY_LABELS } from '@/data/news';
import { formatPrice } from '@/lib/pricing';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const KEEPER_BASE = 'https://www.keepercoating.jp';

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
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      const check = () => { if (window.google?.maps) resolve(window.google.maps); else setTimeout(check, 100); };
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

// ─── Service tier groupings ─────────────────────────────────
const SERVICE_GROUPS = [
  { label: 'FLAGSHIP', ids: ['ex-premium', 'ex'], color: 'from-amber-600 to-yellow-500' },
  { label: 'PREMIUM', ids: ['dia2-premium', 'dia2'], color: 'from-[#0f1c2e] to-slate-700' },
  { label: 'STANDARD', ids: ['diamond-premium', 'diamond'], color: 'from-slate-600 to-slate-500' },
  { label: 'ENTRY', ids: ['fresh', 'crystal'], color: 'from-slate-400 to-slate-300' },
];

const categoryColors: Record<string, string> = {
  educational: 'bg-blue-100 text-blue-700',
  comparison: 'bg-amber-100 text-amber-700',
  seasonal: 'bg-green-100 text-green-700',
};
const categoryLabels: Record<string, string> = {
  educational: '基礎知識',
  comparison: '比較',
  seasonal: '季節',
};

export default function V3HomePage() {
  const [stores, setStores] = useState<StoreWithDistance[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'detecting' | 'done' | 'denied'>('idle');
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Fetch stores
  useEffect(() => {
    fetch('/api/v3/stores')
      .then(res => res.json())
      .then((data: V3StoreData[]) => {
        setStores(data.map(s => ({ ...s, distance: null })));
        setStoresLoading(false);
      })
      .catch(() => setStoresLoading(false));
  }, []);

  // Init map when section is visible
  const initMap = useCallback(() => {
    if (storesLoading || stores.length === 0 || !mapRef.current || mapReady) return;
    loadGoogleMaps().then(maps => {
      const map = new maps.Map(mapRef.current!, {
        center: { lat: 36.5, lng: 137.5 },
        zoom: 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      infoWindowRef.current = new maps.InfoWindow();

      stores.forEach(store => {
        if (!store.lat || !store.lng) return;
        const marker = new maps.Marker({
          position: { lat: store.lat, lng: store.lng },
          map,
          title: store.store_name,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#0f1c2e', strokeWeight: 2 },
        });
        marker.addListener('click', () => {
          setSelectedStore(store.store_id);
          infoWindowRef.current?.setContent(`
            <div style="padding:4px 8px;min-width:180px">
              <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${store.store_name}</div>
              <div style="font-size:11px;color:#666;margin-bottom:4px">${store.address}</div>
              <div style="font-size:11px;color:#666">${store.tel || ''}</div>
              <a href="/v3/${store.store_id}/" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#f59e0b;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold">この店舗を見る →</a>
            </div>
          `);
          infoWindowRef.current?.open(map, marker);
          map.panTo({ lat: store.lat, lng: store.lng });
          document.getElementById(`store-card-${store.store_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        markersRef.current.push(marker);
      });
      setMapReady(true);
    });
  }, [storesLoading, stores, mapReady]);

  // Observe map section visibility
  useEffect(() => {
    if (!mapSectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { initMap(); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(mapSectionRef.current);
    return () => observer.disconnect();
  }, [initMap]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
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
          mapInstanceRef.current.setZoom(10);
        }
      },
      () => setGeoStatus('denied'),
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  const handleStoreClick = (storeId: string) => {
    setSelectedStore(storeId);
    const store = stores.find(s => s.store_id === storeId);
    if (store && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: store.lat, lng: store.lng });
      mapInstanceRef.current.setZoom(13);
    }
  };

  const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const featuredArticles = blogArticles.slice(0, 4);

  return (
    <main>
      {/* ═══ HERO ═══ */}
      <section className="relative bg-[#0a0e14] min-h-[480px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0f1c2e]" />
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${KEEPER_BASE}/img/lineup/p_keeper_logo.png`} alt="" className="h-32 opacity-30" />
        </div>
        <div className="relative text-center px-5 py-20">
          <div className="text-amber-500 text-sm font-semibold tracking-wider mb-4">KeePer PRO SHOP</div>
          <h1 className="text-white text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            洗車だけで、この輝きが続く。
          </h1>
          <p className="text-white/50 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-8">
            特許技術のガラスコーティングで愛車を守る。全国のKeePer認定プロショップで、あなたの車に最適なコースをご提案します。
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="#store-finder" className="px-7 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors">
              近くの店舗を探す
            </a>
            <a href="#services" className="px-7 py-3 bg-white/10 border border-white/25 text-white font-semibold rounded-lg text-sm hover:bg-white/20 transition-colors">
              メニューを見る
            </a>
          </div>
        </div>
      </section>

      {/* ═══ SERVICES MENU ═══ */}
      <section id="services" className="py-16 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>コーティングメニュー</h2>
            <p className="text-sm text-gray-400 mt-2">全8コースのKeePer コーティング。あなたの目的に合った最適なコースをお選びください。</p>
          </div>

          <div className="space-y-6">
            {SERVICE_GROUPS.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded bg-gradient-to-r ${group.color} text-white`}>{group.label}</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {group.ids.map(id => {
                    const tier = coatingTiers.find(t => t.id === id);
                    if (!tier) return null;
                    return (
                      <div key={id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-[#0f1c2e] text-base">
                              {tier.name}
                              {tier.is_popular && <span className="text-[10px] text-amber-600 font-bold ml-2">★人気</span>}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">{tier.tagline}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="text-lg font-bold text-[#0f1c2e]">{formatPrice(tier.prices.SS)}〜</div>
                            <div className="text-[10px] text-gray-400">税込</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>{tier.durability_years}持続</span>
                          <span>{tier.application_time}</span>
                          <span>艶 {'★'.repeat(tier.gloss_rating)}{'☆'.repeat(5 - tier.gloss_rating)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-4">各コースの詳細・技術解説・サイズ別料金表は店舗ページからご確認いただけます。</p>
          </div>
        </div>
      </section>

      {/* ═══ WHY KeePer ═══ */}
      <section className="py-16 px-5 bg-slate-50">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>KeePer が選ばれる理由</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '🏆', title: '特許技術', desc: 'KeePer独自の特許技術による被膜構造。一般的なコーティングとは根本的に異なる科学的アプローチ。' },
              { icon: '👨‍🔬', title: '認定技術者', desc: '1級・2級資格認定制度。全国統一の技術基準で、どの店舗でも同じ品質をお約束。' },
              { icon: '🔬', title: '研究開発力', desc: 'KeePer技研の研究所で開発されたコーティング剤。科学的データに基づく確かな性能。' },
              { icon: '💰', title: 'Web予約割引', desc: 'Web予約限定で最大20%OFF。オプションも全メニュー10%OFFで施工可能。' },
              { icon: '🚿', title: '無料アフターケア', desc: '施工後の手洗い洗車＆点検を2回無料。コーティングの状態をプロが確認。' },
              { icon: '📋', title: '完全予約制', desc: '一台一台を丁寧に施工。完全予約制で待ち時間なし。朝預けて夕方お引渡し。' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-[#0f1c2e] mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STORE FINDER MAP ═══ */}
      <section id="store-finder" ref={mapSectionRef} className="bg-[#0f1c2e]">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-white text-xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>店舗検索</h2>
              <p className="text-white/40 text-xs mt-0.5">お近くのKeePer PRO SHOPを探す</p>
            </div>
            <div className="flex items-center gap-3">
              {geoStatus === 'idle' && (
                <button onClick={detectLocation} className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 cursor-pointer">
                  現在地から探す
                </button>
              )}
              {geoStatus === 'detecting' && <span className="text-white/40 text-xs">位置情報を取得中...</span>}
              {geoStatus === 'denied' && (
                <button onClick={detectLocation} className="px-4 py-2 bg-white/10 border border-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/20 cursor-pointer">
                  現在地を再取得
                </button>
              )}
              {geoStatus === 'done' && <span className="text-emerald-400 text-xs font-semibold">現在地取得済み — 近い順に表示</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row" style={{ height: '500px' }}>
          {/* Map */}
          <div className="flex-1 relative min-h-[250px] md:min-h-0">
            <div ref={mapRef} className="absolute inset-0" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0f1c2e]">
                {storesLoading
                  ? <p className="text-white/40 text-sm">店舗データを読み込み中...</p>
                  : <p className="text-white/40 text-sm">地図を読み込み中...</p>
                }
              </div>
            )}
          </div>

          {/* Store list */}
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
                      <div className="flex items-center gap-3 mt-1.5">
                        {store.tel && <span className="text-white/40 text-xs">{store.tel}</span>}
                        {store.has_booth && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">ブース</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {store.distance !== null && (
                        <span className="text-amber-400 text-xs font-bold">
                          {store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}
                        </span>
                      )}
                      <Link href={`/v3/${store.store_id}/`}
                        className="px-3 py-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-md hover:bg-amber-600 transition-colors"
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

      {/* ═══ BLOG / COLUMNS ═══ */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>コラム・お役立ち情報</h2>
            <p className="text-sm text-gray-400 mt-2">初めてのコーティングで迷わないための基礎知識</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredArticles.map(article => (
              <Link key={article.slug} href={`/blog/${article.slug}`}
                className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[article.category]}`}>
                      {categoryLabels[article.category]}
                    </span>
                    <span className="text-[10px] text-gray-400">{article.publishDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f1c2e] mb-2 group-hover:text-amber-700 transition-colors leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{article.summary}</p>
                  <span className="inline-block mt-3 text-xs font-semibold text-amber-600 group-hover:underline">続きを読む →</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/blog" className="px-6 py-2.5 bg-gray-100 text-[#0f1c2e] font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors">
              すべての記事を見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ NEWS ═══ */}
      <section className="py-16 px-5 bg-slate-50">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>お知らせ</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {sortedNews.map(item => (
              <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                  <span className="text-xs text-gray-400 w-[80px]">{item.date}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_LABELS[item.category]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORY_LABELS[item.category]?.label || item.category}
                  </span>
                </div>
                <p className="text-sm text-[#0f1c2e] font-medium flex-1">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROCESS STEPS ═══ */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご利用の流れ</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: '1', title: '店舗を探す', desc: '現在地から最寄りのKeePer PRO SHOPを検索。' },
              { num: '2', title: '見積もり・ご相談', desc: 'Webまたはお電話で無料見積もり。おすすめコースをご提案。' },
              { num: '3', title: 'Web予約', desc: 'カレンダーから希望日時を選択。限定割引が自動適用。' },
              { num: '4', title: '施工・お引渡し', desc: '朝お預け → 夕方お引渡し。無料点検2回付き。' },
            ].map(step => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 text-white font-bold flex items-center justify-center text-lg mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-bold text-sm text-[#0f1c2e] mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-14 px-5 bg-[#0f1c2e]">
        <div className="max-w-[600px] mx-auto text-center text-white">
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>コーティングを始めませんか？</h2>
          <p className="text-sm text-white/40 mb-6">お近くの店舗で無料見積もり。Web予約限定の割引特典もご用意しています。</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="#store-finder" className="px-7 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors">
              近くの店舗を探す
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
