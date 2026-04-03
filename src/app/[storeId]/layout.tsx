import { getAllStoresAsync, getAllStoreIds, getStoreCampaign } from '@/lib/store-data';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';

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
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const stores = await getAllStoresAsync(`${protocol}://${host}`);
  const store = stores.find(s => s.store_id === storeId);
  if (!store) notFound();

  const campaign = getStoreCampaign(store);

  return (
    <>
      <Header storeId={storeId} storeName={store.store_name} tel={store.tel} lineUrl={store.line_url} />
      <div className="pt-14">
        <DynamicBanner
          title={campaign.title}
          discountRate={campaign.discount_rate}
          deadline={campaign.deadline}
          colorCode={campaign.color}
        />
      </div>
      {children}
      <Footer
        storeId={storeId}
        storeName={store.store_name}
        tel={store.tel}
        address={store.address}
        businessHours={store.business_hours}
      />
      <MobileCTA tel={store.tel} lineUrl={store.line_url} />
      <div className="h-14 md:h-0" /> {/* Space for mobile CTA bar */}
    </>
  );
}
