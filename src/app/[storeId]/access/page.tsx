import { getStoreByIdAsync, getBaseUrl, getNearbyStations } from '@/lib/store-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function AccessPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const store = await getStoreByIdAsync(storeId, await getBaseUrl());
  if (!store) notFound();
  const stations = getNearbyStations(store);

  return (
    <main>
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1 className="text-white text-xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          店舗案内 — {store.store_name}
        </h1>
        <div className="flex gap-3 justify-center mt-3 text-xs text-white/70">
          <span>KeePer PRO SHOP認定</span>
          {store.has_booth && <span>専用ブース完備</span>}
          <span>1級資格者 {store.level1_staff_count}名</span>
        </div>
      </section>

      {/* WHY THIS SHOP */}
      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>当店の特徴</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🏆', title: '専門店の技術力', desc: `1級資格者${store.level1_staff_count}名在籍` },
              { icon: '💰', title: '明朗会計', desc: 'Web予約限定割引あり' },
              { icon: '🔧', title: '充実のアフターケア', desc: '無料洗車点検2回付き' },
              { icon: '🚗', title: 'アクセス便利', desc: `駐車場${store.parking_spaces}台完備` },
            ].map(item => (
              <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:shadow-lg transition-shadow">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-bold text-sm text-[#0f1c2e] mb-1">{item.title}</div>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISIT FLOW */}
      <section className="py-10 px-5 bg-gray-50">
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご来店の流れ</h2>
          <div className="space-y-4">
            {[
              { num: '1', title: 'ご来店・受付', desc: `駐車場${store.parking_spaces}台完備。受付でコースを最終確認。` },
              { num: '2', title: 'お車をお預け', desc: `${stations.length > 0 ? `${stations[0].name}まで${stations[0].time}。` : ''}お仕事やお買い物へ。待合室もご利用可。` },
              { num: '3', title: '施工完了・お引渡し', desc: '完了次第お電話。仕上がり確認後、お手入れ方法をご説明。' },
            ].map(step => (
              <div key={step.num} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0">{step.num}</div>
                <div>
                  <div className="font-bold text-sm">{step.title}</div>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAP + DETAILS */}
      <section className="py-10 px-5">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>アクセス</h2>
          <div className="grid md:grid-cols-[3fr_2fr] gap-8">
            <div>
              {store.lat && store.lng ? (
                <iframe
                  src={`https://www.google.com/maps?q=${store.lat},${store.lng}&z=16&output=embed`}
                  className="w-full aspect-[4/3] rounded-xl border-0"
                  loading="lazy"
                  allowFullScreen
                  title="店舗の地図"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-xl bg-blue-100 border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-500 text-sm">
                  地図を読み込み中...
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {['店舗外観', '施工エリア', '待合室', '設備'].map(label => (
                  <div key={label} className="aspect-[4/3] bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                    [IMAGE: {label}]
                  </div>
                ))}
              </div>
            </div>
            <div>
              <dl className="grid grid-cols-[5.5em_1fr] gap-y-2.5 gap-x-4 text-sm">
                <dt className="font-semibold text-[#0f1c2e]">住所</dt>
                <dd>〒{store.postal_code}<br />{store.address}</dd>
                <dt className="font-semibold text-[#0f1c2e]">営業時間</dt>
                <dd>{store.business_hours}</dd>
                <dt className="font-semibold text-[#0f1c2e]">定休日</dt>
                <dd>{store.regular_holiday}</dd>
                <dt className="font-semibold text-[#0f1c2e]">電話</dt>
                <dd><a href={`tel:${store.tel}`} className="text-amber-600 font-semibold">{store.tel}</a>（通話無料）</dd>
                <dt className="font-semibold text-[#0f1c2e]">駐車場</dt>
                <dd>{store.parking_spaces}台</dd>
                {stations.length > 0 && (
                  <>
                    <dt className="font-semibold text-[#0f1c2e]">電車</dt>
                    <dd>{stations.map(s => `${s.name} ${s.time}`).join('、')}</dd>
                  </>
                )}
                {store.landmark && (
                  <>
                    <dt className="font-semibold text-[#0f1c2e]">目印</dt>
                    <dd>{store.landmark}</dd>
                  </>
                )}
              </dl>
              <div className="flex gap-2 mt-5 flex-wrap">
                <Link href={`/${storeId}/booking`} className="px-4 py-2.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-lg text-sm">ご予約 →</Link>
                {store.line_url && <a href={store.line_url} className="px-4 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINE相談</a>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STAFF */}
      <section className="py-10 px-5 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-lg font-bold text-[#0f1c2e] text-center mb-6" style={{ fontFamily: '"Noto Serif JP", serif' }}>スタッフ紹介</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="w-full aspect-[3/4] bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 text-sm mb-3">
                  [STAFF PHOTO {i}]
                </div>
                <div className="font-bold">スタッフ {i}</div>
                <div className="text-xs text-gray-500">KeePer {i <= store.level1_staff_count ? '1' : '2'}級認定</div>
                <p className="text-xs text-gray-400 italic mt-1">&quot;丁寧な施工を心がけています&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
