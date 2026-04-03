import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import {
  getBaseUrl,
  getStoreByIdAsync,
  getCampaignDefaultsAsync,
  mergeStoreCampaign,
  getAllStoreIds,
} from '@/lib/store-data';

export async function generateStaticParams() {
  return getAllStoreIds().map(id => ({ storeId: id }));
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const baseUrl = await getBaseUrl();
  const store = await getStoreByIdAsync(storeId, baseUrl);

  if (!store) {
    notFound();
  }

  const defaults = await getCampaignDefaultsAsync(baseUrl);
  const campaign = mergeStoreCampaign(store, defaults);

  return (
    <>
      <Header
        storeId={store.store_id}
        storeName={store.store_name}
        tel={store.tel}
        lineUrl={store.line_url}
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
