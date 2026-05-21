import { notFound } from 'next/navigation';
import { getStoreBySlug } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { parseGuideConfig, getCustomizedTiers } from '@/lib/guide-config';
import { getMasterCoatingTiers } from '@/lib/master-data';
import { GuideBody } from '@/app/[slug]/(chrome)/guide/GuideBody';

export default async function NestedGuidePage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  const [rawStore, globalDefaults, baseTiers] = await Promise.all([
    getStoreBySlug(slug, subSlug),
    getGlobalDefaults(),
    getMasterCoatingTiers(),
  ]);

  if (!rawStore) notFound();

  const store = applyDefaults(rawStore, globalDefaults);
  const guideConfig = parseGuideConfig(store.guide_config);
  const tiers = getCustomizedTiers(guideConfig, baseTiers);
  const basePath = `/${slug}/${subSlug}`;

  return <GuideBody store={store} basePath={basePath} tiers={tiers} />;
}
