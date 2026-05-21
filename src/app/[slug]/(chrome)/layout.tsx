import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import QuizPopup from '@/components/QuizPopup';
import { getV3StoreById, getV3CampaignDefaults, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import { getGlobalDefaults } from '@/lib/global-defaults';

function getLatestNewsTitle(storeNewsJson: string | undefined): string | undefined {
  try {
    const items = JSON.parse(storeNewsJson || '[]');
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const visible = items.filter((n: { visible?: boolean }) => n.visible !== false);
    if (visible.length === 0) return undefined;
    visible.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
    const latest = visible[0] as { title?: string; content?: string; body?: string };
    const title = (latest.title || '').trim();
    const content = (latest.content || latest.body || '').replace(/\s+/g, ' ').trim();
    if (!title) return content || undefined;
    return content ? `${title} — ${content}` : title;
  } catch { return undefined; }
}

function mergeCampaign(store: { campaign_title: string; campaign_deadline: string; discount_rate: number; campaign_color_code: string }, defaults: { title: string; color: string; end: string; discount: number; font?: string; force_hq_campaign?: boolean }) {
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
    discount_rate: store.discount_rate ?? defaults.discount,
    deadline: store.campaign_deadline || defaults.end,
    color: store.campaign_color_code || defaults.color,
    font: defaults.font,
  };
}

export default async function ChromeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const globalDefaults = await getGlobalDefaults().catch((error) => {
    console.error(`[slug]/(chrome) layout: getGlobalDefaults failed for "${slug}":`, error);
    return null;
  });
  if (!globalDefaults) notFound();

  const campaignWins = globalDefaults.campaignOverridesNews !== false;

  const store = await getV3StoreById(slug).catch((error) => {
    console.error(`[slug]/(chrome) layout: getV3StoreById failed for "${slug}":`, error);
    return null;
  });

  if (store && store.is_active) {
    const defaults = await getV3CampaignDefaults().catch((error) => {
      console.error(`[slug]/(chrome) layout: getV3CampaignDefaults failed for "${slug}":`, error);
      return null;
    });
    if (!defaults) notFound();

    const campaign = mergeCampaign(store, defaults);
    if (defaults.end && new Date(defaults.end) < new Date()) {
      campaign.discount_rate = 0;
    }
    const newsTitle =
      campaignWins && campaign.discount_rate > 0
        ? undefined
        : getLatestNewsTitle(store.store_news);

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

  const subCompany = await getSubCompanyBySlug(slug).catch((error) => {
    console.error(`[slug]/(chrome) layout: getSubCompanyBySlug failed for "${slug}":`, error);
    return null;
  });

  if (subCompany) {
    const scStores = await getStoresBySubCompany(subCompany.id).catch((error) => {
      console.error(`[slug]/(chrome) layout: getStoresBySubCompany failed for "${slug}":`, error);
      return null;
    });
    if (!scStores || scStores.length === 0) notFound();

    const primaryStore = scStores[0];
    const defaults = await getV3CampaignDefaults().catch((error) => {
      console.error(`[slug]/(chrome) layout: getV3CampaignDefaults (sub-company) failed for "${slug}":`, error);
      return null;
    });
    if (!defaults) notFound();

    const campaign = mergeCampaign(primaryStore, defaults);
    if (defaults.end && new Date(defaults.end) < new Date()) {
      campaign.discount_rate = 0;
    }
    const scNewsTitle =
      campaignWins && campaign.discount_rate > 0
        ? undefined
        : getLatestNewsTitle(primaryStore.store_news);

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

  notFound();
}
