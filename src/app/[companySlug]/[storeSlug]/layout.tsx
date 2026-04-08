export const revalidate = 60; // revalidate every 60 seconds

import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import { getStoreBySlug, getV3CampaignDefaults } from '@/lib/firebase-stores';

function mergeV3Campaign(
  store: { campaign_title: string; campaign_deadline: string; discount_rate: number; campaign_color_code: string },
  defaults: { title: string; color: string; end: string; discount: number },
) {
  return {
    title: store.campaign_title || defaults.title,
    discount_rate: store.discount_rate || defaults.discount,
    deadline: store.campaign_deadline || defaults.end,
    color: store.campaign_color_code || defaults.color,
  };
}

export default async function SubCompanyStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string; storeSlug: string }>;
}) {
  const { companySlug, storeSlug } = await params;

  let store;
  let campaign;
  try {
    store = await getStoreBySlug(companySlug, storeSlug);
    if (!store) notFound();
    const defaults = await getV3CampaignDefaults();
    campaign = mergeV3Campaign(store, defaults);
  } catch {
    notFound();
  }

  const basePath = `/${companySlug}/${storeSlug}`;

  return (
    <>
      <Header
        storeId={store.store_id}
        storeName={store.store_name}
        tel={store.tel}
        lineUrl={store.line_url}
        basePath={basePath}
      />
      <div className="pt-14">
        <DynamicBanner
          title={campaign.title}
          discountRate={campaign.discount_rate}
          deadline={campaign.deadline}
          colorCode={campaign.color}
        />
        {children}
      </div>
      <Footer
        storeId={store.store_id}
        storeName={store.store_name}
        tel={store.tel}
        address={store.address}
        businessHours={store.business_hours}
      />
      <MobileCTA tel={store.tel} lineUrl={store.line_url} />
    </>
  );
}
