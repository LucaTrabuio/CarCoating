import { getAllStores } from '@/lib/store-data';
import Link from 'next/link';

export default function Home() {
  const stores = getAllStores();

  return (
    <main className="min-h-screen bg-[#0f1c2e]">
      <div className="max-w-[1100px] mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <div className="text-amber-500 text-sm font-semibold mb-2">KeePer PRO SHOP</div>
          <h1 className="text-white text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            カーコーティング専門店
          </h1>
          <p className="text-white/50 text-sm max-w-lg mx-auto">
            全国{stores.length}店舗のKeePer認定プロショップ。お近くの店舗をお選びください。
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map(store => (
            <Link
              key={store.store_id}
              href={`/${store.store_id}`}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-white font-bold text-lg group-hover:text-amber-400 transition-colors">
                    {store.store_name}
                  </h2>
                  <p className="text-white/40 text-xs mt-0.5">{store.prefecture} {store.city}</p>
                </div>
                <div className="flex gap-1">
                  {store.has_booth && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">ブース</span>
                  )}
                  {store.level1_staff_count > 0 && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">1級×{store.level1_staff_count}</span>
                  )}
                </div>
              </div>
              <div className="text-white/50 text-xs space-y-1">
                <div>📍 {store.address}</div>
                <div>📞 {store.tel}</div>
                <div>🕐 {store.business_hours}（{store.regular_holiday}）</div>
              </div>
              {store.campaign_title && (
                <div className="mt-3 text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1.5 rounded font-semibold">
                  {store.campaign_title} ｜ 最大{store.discount_rate}%OFF
                </div>
              )}
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/admin" className="text-white/30 text-xs hover:text-white/60 transition-colors">管理パネル →</Link>
        </div>
      </div>
    </main>
  );
}
