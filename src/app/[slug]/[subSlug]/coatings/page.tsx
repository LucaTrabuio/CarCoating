import { notFound } from 'next/navigation';
import { getStoreBySlug, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { getMasterCoatingTiers } from '@/lib/master-data';
import { CoatingsBody } from '@/app/[slug]/(chrome)/coatings/CoatingsBody';

export default async function NestedCoatingsPage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  const [rawStore, globalDefaults, coatingTiers, defaults] = await Promise.all([
    getStoreBySlug(slug, subSlug),
    getGlobalDefaults(),
    getMasterCoatingTiers(),
    getV3CampaignDefaults(),
  ]);

  if (!rawStore) notFound();

  const store = applyDefaults(rawStore, globalDefaults);
  const discountRate = defaults.force_hq_campaign ? defaults.discount : (store.discount_rate ?? defaults.discount);
  const basePath = `/${slug}/${subSlug}`;

  return <CoatingsBody store={store} basePath={basePath} discountRate={discountRate} coatingTiers={coatingTiers} />;
}
