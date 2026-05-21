export const revalidate = 60;

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileCTA from '@/components/MobileCTA';
import DynamicBanner from '@/components/DynamicBanner';
import QuizPopup from '@/components/QuizPopup';
import { getStoreBySlug, getV3CampaignDefaults } from '@/lib/firebase-stores';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}): Promise<Metadata> {
  try {
    const { slug, subSlug } = await params;
    const store = await getStoreBySlug(slug, subSlug);
    if (store) {
      const title = store.hero_title
        ? `${store.hero_title}｜${store.store_name}`
        : `${store.store_name}｜KeePer PRO SHOP`;
      const description =
        store.meta_description || store.description || `${store.store_name}のカーコーティング。Web予約限定割引あり。`;
      return {
        title,
        description,
        ...(store.seo_keywords ? { keywords: store.seo_keywords.split(/[,、\s]+/).filter(Boolean) } : {}),
        openGraph: { title, description },
      };
    }
  } catch { /* return defaults */ }
  return {};
}

export default async function NestedStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  // Resolve data first (errors → notFound, logged) so the JSX return is NOT
  // constructed inside a try/catch (react-hooks/error-boundaries).
  const store = await getStoreBySlug(slug, subSlug).catch((error) => {
    console.error(`[slug]/[subSlug] layout: getStoreBySlug failed for "${slug}/${subSlug}":`, error);
    return null;
  });
  if (!store || !store.is_active) {
    notFound();
  }

  const [globalDefaults, defaults] = await Promise.all([
    getGlobalDefaults(),
    getV3CampaignDefaults(),
  ]);
  const campaignWins = globalDefaults.campaignOverridesNews !== false;

  const campaign = defaults.force_hq_campaign
    ? {
        title: defaults.title,
        discount_rate: defaults.discount,
        deadline: defaults.end,
        color: defaults.color,
        font: defaults.font,
      }
    : {
        title: store.campaign_title || defaults.title,
        discount_rate: store.discount_rate ?? defaults.discount,
        deadline: store.campaign_deadline || defaults.end,
        color: store.campaign_color_code || defaults.color,
        font: defaults.font,
      };
  if (defaults.end && new Date(defaults.end) < new Date()) {
    campaign.discount_rate = 0;
  }

  const newsTitle =
    campaignWins && campaign.discount_rate > 0
      ? undefined
      : getLatestNewsTitle(store.store_news);

  const basePath = `/${slug}/${subSlug}`;

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
      <MobileCTA tel={store.tel} lineUrl={store.line_url} storeId={store.store_id} basePath={basePath} />
      <QuizPopup storeId={store.store_id} basePath={basePath} />
    </>
  );
}
