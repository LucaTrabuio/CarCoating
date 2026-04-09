export const revalidate = 60;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import { getV3StoreById, getAllV3StoreIds, getV3CampaignDefaults, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const store = await getV3StoreById(slug);
    if (store) {
      return {
        title: `${store.store_name}｜KeePer PRO SHOP`,
        description: store.meta_description || `${store.store_name}のカーコーティング。Web予約限定割引あり。`,
      };
    }
    const subCompany = await getSubCompanyBySlug(slug);
    if (subCompany) {
      return { title: `${subCompany.name}｜KeePer PRO SHOP` };
    }
  } catch { /* return defaults */ }
  return {};
}

export async function generateStaticParams() {
  try {
    const ids = await getAllV3StoreIds();
    return ids.map(id => ({ slug: id }));
  } catch {
    return [];
  }
}

function mergeCampaign(store: { campaign_title: string; campaign_deadline: string; discount_rate: number; campaign_color_code: string }, defaults: { title: string; color: string; end: string; discount: number; font?: string }) {
  return {
    title: store.campaign_title || defaults.title,
    discount_rate: store.discount_rate || defaults.discount,
    deadline: store.campaign_deadline || defaults.end,
    color: store.campaign_color_code || defaults.color,
    font: defaults.font,
  };
}

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    // Check if this is a store
    const store = await getV3StoreById(slug);
    if (store && store.is_active) {
      const defaults = await getV3CampaignDefaults();
      const campaign = mergeCampaign(store, defaults);

      return (
        <>
          <Header
            storeId={store.store_id}
            storeName={store.store_name}
            tel={store.tel}
            lineUrl={store.line_url}
            basePath={`/${store.store_id}`}
          />
          <div className="pt-14">
            <DynamicBanner
              title={campaign.title}
              discountRate={campaign.discount_rate}
              deadline={campaign.deadline}
              colorCode={campaign.color}
              fontId={campaign.font}
            />
            {children}
          </div>
          <Footer
            storeId={store.store_id}
            storeName={store.store_name}
            tel={store.tel}
            address={store.address}
            businessHours={store.business_hours}
            regularHoliday={store.regular_holiday}
          />
          <MobileCTA tel={store.tel} lineUrl={store.line_url} />
        </>
      );
    }

    // Check if this is a sub-company — wrap with Header/Footer using primary store's contact info
    const subCompany = await getSubCompanyBySlug(slug);
    if (subCompany) {
      const scStores = await getStoresBySubCompany(subCompany.id);
      if (scStores.length === 0) notFound();
      const primaryStore = scStores[0];
      const defaults = await getV3CampaignDefaults();
      const campaign = mergeCampaign(primaryStore, defaults);

      return (
        <>
          <Header
            storeId={slug}
            storeName={subCompany.name}
            tel={primaryStore.tel}
            lineUrl={primaryStore.line_url}
            basePath={`/${slug}`}
          />
          <div className="pt-14">
            <DynamicBanner
              title={campaign.title}
              discountRate={campaign.discount_rate}
              deadline={campaign.deadline}
              colorCode={campaign.color}
              fontId={campaign.font}
            />
            {children}
          </div>
          <Footer
            storeId={slug}
            storeName={subCompany.name}
            tel={primaryStore.tel}
            address={primaryStore.address}
            businessHours={primaryStore.business_hours}
            regularHoliday={primaryStore.regular_holiday}
            isMultiStore={scStores.length > 1}
          />
          <MobileCTA tel={primaryStore.tel} lineUrl={primaryStore.line_url} />
        </>
      );
    }
  } catch (error) {
    console.error(`[slug] layout error for "${slug}":`, error);
  }

  notFound();
}
