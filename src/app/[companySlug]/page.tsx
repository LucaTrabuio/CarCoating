export const revalidate = 60;

import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { getSubCompanyBySlug, getStoresBySubCompany, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { parsePageLayout } from '@/lib/block-types';
import SubCompanyStoreMap from '@/components/SubCompanyStoreMap';

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

          {/* Interactive store map — all locations with distance calculation */}
          <SubCompanyStoreMap
            stores={stores.map(s => ({
              store_id: s.store_id,
              store_name: s.store_name,
              address: s.address,
              tel: s.tel,
              business_hours: s.business_hours,
              regular_holiday: s.regular_holiday,
              parking_spaces: s.parking_spaces,
              landmark: s.landmark,
              nearby_stations: s.nearby_stations,
              has_booth: s.has_booth,
              lat: s.lat,
              lng: s.lng,
            }))}
            groupName={subCompany.name}
          />

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
