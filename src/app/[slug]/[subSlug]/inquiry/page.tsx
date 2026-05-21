import { notFound } from 'next/navigation';
import { getStoreBySlug } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { getMasterCoatingTiers } from '@/lib/master-data';
import { SingleStoreInquiry } from '@/app/[slug]/(chrome)/inquiry/InquirySingle';

export default async function NestedInquiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
  searchParams: Promise<{ tier?: string; prefill?: string }>;
}) {
  const { slug, subSlug } = await params;
  const { tier: preselectedTier, prefill } = await searchParams;

  const [rawStore, globalDefaults, tiers] = await Promise.all([
    getStoreBySlug(slug, subSlug),
    getGlobalDefaults(),
    getMasterCoatingTiers(),
  ]);

  if (!rawStore) notFound();

  const store = applyDefaults(rawStore, globalDefaults);

  return (
    <SingleStoreInquiry
      store={store}
      tiers={tiers}
      preselectedTier={preselectedTier}
      prefillType={prefill}
      displayName={store.store_name}
    />
  );
}
