export const revalidate = 60;

import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { getSubCompanyBySlug, getStoresBySubCompany, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { parsePageLayout } from '@/lib/block-types';

export default async function SubCompanySitePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const subCompany = await getSubCompanyBySlug(companySlug);
  if (!subCompany) notFound();

  const stores = await getStoresBySubCompany(subCompany.id);
  if (stores.length === 0) notFound();

  // Use the first store as the "primary" store for shared content
  const primaryStore = stores[0];
  const defaults = await getV3CampaignDefaults();
  const discountRate = primaryStore.discount_rate || defaults.discount;
  const basePath = `/${companySlug}`;

  const campaign = {
    title: primaryStore.campaign_title || defaults.title,
    discount_rate: primaryStore.discount_rate || defaults.discount,
    deadline: primaryStore.campaign_deadline || defaults.end,
    color: primaryStore.campaign_color_code || defaults.color,
  };

  const layout = parsePageLayout(primaryStore.page_layout, primaryStore);

  return (
    <>
      <Header
        storeId={primaryStore.store_id}
        storeName={subCompany.name}
        tel={primaryStore.tel}
        lineUrl={primaryStore.line_url}
        basePath={basePath}
      />
      <div className="pt-14">
        <DynamicBanner
          title={campaign.title}
          discountRate={campaign.discount_rate}
          deadline={campaign.deadline}
          colorCode={campaign.color}
        />

        <main>
          {/* Render all blocks from the primary store's layout */}
          {layout.blocks
            .filter(b => b.visible)
            .sort((a, b) => a.order - b.order)
            .map(block => (
              <BlockRenderer
                key={block.id}
                block={block}
                store={primaryStore}
                basePath={basePath}
                discountRate={discountRate}
              />
            ))}

          {/* Multi-store map section — shows ALL locations in this group */}
          <section className="py-14 px-5 bg-slate-50">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
                  店舗一覧・アクセス
                </h2>
                <p className="text-sm text-gray-500 mt-1">{subCompany.name} — {stores.length}店舗</p>
              </div>

              {/* Map */}
              <div className="rounded-xl overflow-hidden border border-gray-200 mb-8">
                <iframe
                  src={`https://maps.google.com/maps?q=${primaryStore.lat},${primaryStore.lng}&z=${stores.length > 3 ? 9 : 11}&output=embed`}
                  width="100%" height="400" style={{ border: 0 }} loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${subCompany.name} 店舗マップ`}
                />
              </div>

              {/* Store cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map(store => {
                  let stations: { name: string; time: string }[] = [];
                  try { stations = JSON.parse(store.nearby_stations || '[]'); } catch { /* */ }
                  return (
                    <div key={store.store_id} className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="font-bold text-[#0f1c2e] mb-2">{store.store_name}</h3>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-gray-600">{store.address}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">営業時間: </span>
                            <span className="text-gray-700">{store.business_hours}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">定休日: </span>
                            <span className="text-gray-700">{store.regular_holiday}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">駐車場: </span>
                            <span className="text-gray-700">{store.parking_spaces}台</span>
                          </div>
                          <div>
                            <span className="text-gray-400">電話: </span>
                            <a href={`tel:${store.tel}`} className="text-amber-600 font-semibold">{store.tel}</a>
                          </div>
                        </div>
                        {stations.length > 0 && (
                          <p className="text-xs text-gray-500">
                            最寄り: {stations.map(s => `${s.name}（${s.time}）`).join('、')}
                          </p>
                        )}
                        {store.landmark && (
                          <p className="text-xs text-gray-500">目印: {store.landmark}</p>
                        )}
                        {store.has_booth && (
                          <span className="inline-block text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">
                            専用ブース完備
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Booking CTA with store selector */}
          <section className="bg-gray-900 text-white py-10 text-center">
            <div className="max-w-[1100px] mx-auto px-5">
              <div className="text-lg font-bold mb-1">ご予約・お見積もりはお気軽に</div>
              <div className="text-sm opacity-50 mb-4">ご希望の店舗をお選びください</div>
              <div className="flex flex-wrap gap-3 justify-center mb-4">
                {stores.map(store => (
                  <a key={store.store_id} href={`tel:${store.tel}`}
                    className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-sm hover:bg-amber-500/30 transition-colors">
                    <div className="font-bold text-amber-400">{store.store_name.replace('キーパープロショップ ', '')}</div>
                    <div className="text-xs text-amber-300/70">{store.tel}</div>
                  </a>
                ))}
              </div>
              {primaryStore.line_url && (
                <a href={primaryStore.line_url} target="_blank" rel="noopener noreferrer"
                  className="inline-block px-6 py-2.5 bg-[#06c755] text-white font-bold rounded-lg text-sm">
                  LINEで相談する
                </a>
              )}
            </div>
          </section>
        </main>
      </div>
      <Footer
        storeId={primaryStore.store_id}
        storeName={subCompany.name}
        tel={primaryStore.tel}
        address={primaryStore.address}
        businessHours={primaryStore.business_hours}
      />
      <MobileCTA tel={primaryStore.tel} lineUrl={primaryStore.line_url} />
    </>
  );
}
