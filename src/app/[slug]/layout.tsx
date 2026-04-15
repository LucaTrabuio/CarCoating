export const revalidate = 60;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import QuizPopup from '@/components/QuizPopup';
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

function getLatestNewsTitle(storeNewsJson: string | undefined): string | undefined {
  try {
    const items = JSON.parse(storeNewsJson || '[]');
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const visible = items.filter((n: { visible?: boolean }) => n.visible !== false);
    if (visible.length === 0) return undefined;
    visible.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
    return visible[0].title;
  } catch { return undefined; }
}

function mergeCampaign(store: { campaign_title: string; campaign_deadline: string; discount_rate: number; campaign_color_code: string }, defaults: { title: string; color: string; end: string; discount: number; font?: string; force_hq_campaign?: boolean }) {
  // When force_hq_campaign is enabled, ignore per-store campaign settings
  if (defaults.force_hq_campaign) {
    return {
      title: defaults.title,
      discount_rate: defaults.discount,
      deadline: defaults.end,
      color: defaults.color,
      font: defaults.font,
    };
  }
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
      const newsTitle = campaign.discount_rate > 0 ? undefined : getLatestNewsTitle(store.store_news);

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
              newsText={newsTitle}
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
          <MobileCTA tel={store.tel} lineUrl={store.line_url} storeId={store.store_id} basePath={`/${slug}`} />
          <QuizPopup storeId={store.store_id} basePath={`/${slug}`} />
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
      const scNewsTitle = campaign.discount_rate > 0 ? undefined : getLatestNewsTitle(primaryStore.store_news);

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
              newsText={scNewsTitle}
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
            stores={scStores.map(s => ({ name: s.store_name, tel: s.tel }))}
          />
          <MobileCTA tel={primaryStore.tel} lineUrl={primaryStore.line_url} storeId={primaryStore.store_id} basePath={`/${slug}`} />
          <QuizPopup storeId={primaryStore.store_id} basePath={`/${slug}`} />
        </>
      );
    }
  } catch (error) {
    console.error(`[slug] layout error for "${slug}":`, error);
  }

  notFound();
}
