import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import { getV3StoreById, getAllV3StoreIds, getV3CampaignDefaults } from '@/lib/firebase-stores';

export async function generateStaticParams() {
  try {
    const ids = await getAllV3StoreIds();
    return ids.map(id => ({ storeId: id }));
  } catch {
    return [];
  }
}

function mergeV3Campaign(store: { campaign_title: string; campaign_deadline: string; discount_rate: number; campaign_color_code: string }, defaults: { title: string; color: string; end: string; discount: number }) {
  return {
    title: store.campaign_title || defaults.title,
    discount_rate: store.discount_rate || defaults.discount,
    deadline: store.campaign_deadline || defaults.end,
    color: store.campaign_color_code || defaults.color,
  };
}

export default async function V3StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  let store;
  let campaign;
  try {
    store = await getV3StoreById(storeId);
    if (!store || !store.is_active) notFound();
    const defaults = await getV3CampaignDefaults();
    campaign = mergeV3Campaign(store, defaults);
  } catch {
    notFound();
  }

  return (
    <>
      <Header
        storeId={store.store_id}
        storeName={store.store_name}
        tel={store.tel}
        lineUrl={store.line_url}
        basePath={`/v3/${store.store_id}`}
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
