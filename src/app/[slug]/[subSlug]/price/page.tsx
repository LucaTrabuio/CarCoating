import { notFound } from 'next/navigation';
import { getStoreBySlug, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import PriceContent from '@/app/[slug]/(chrome)/price/PriceContent';

export default async function NestedPricePage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  const [rawStore, globalDefaults, defaults] = await Promise.all([
    getStoreBySlug(slug, subSlug),
    getGlobalDefaults(),
    getV3CampaignDefaults(),
  ]);

  if (!rawStore) notFound();

  const store = applyDefaults(rawStore, globalDefaults);
  const discountRate = defaults.force_hq_campaign ? defaults.discount : (store.discount_rate ?? defaults.discount);
  const basePath = `/${slug}/${subSlug}`;

  return <PriceContent store={store} discountRateOverride={discountRate} basePath={basePath} />;
}
