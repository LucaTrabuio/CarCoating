import { notFound } from 'next/navigation';
import { getStoreBySlug, getV3CampaignDefaults, getStoresBySubCompany } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { getMasterAppealPoints } from '@/lib/master-data';
import { renderStorePage } from '@/app/[slug]/(chrome)/page';

export default async function NestedStorePage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  const [rawStore, globalDefaults, appealPointsMaster, defaults] = await Promise.all([
    getStoreBySlug(slug, subSlug),
    getGlobalDefaults(),
    getMasterAppealPoints(),
    getV3CampaignDefaults(),
  ]);

  if (!rawStore) notFound();

  const store = applyDefaults(rawStore, globalDefaults);

  let discountRate = defaults.force_hq_campaign
    ? defaults.discount
    : (store.discount_rate ?? defaults.discount);
  if (defaults.end && new Date(defaults.end) < new Date()) discountRate = 0;

  let siblingStores: typeof store[] | undefined;
  if (store.sub_company_id) {
    try {
      const rawSiblings = await getStoresBySubCompany(store.sub_company_id);
      siblingStores = rawSiblings.map(s => applyDefaults(s, globalDefaults));
    } catch {
      siblingStores = undefined;
    }
  }

  const basePath = `/${slug}/${subSlug}`;

  return renderStorePage({ store, basePath, discountRate, siblingStores, appealPointsMaster });
}
