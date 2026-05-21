import { notFound } from 'next/navigation';
import { getStoreBySlug, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { OptionsBody, resolveOptionsConfig } from '@/app/[slug]/(chrome)/options/OptionsBody';

export default async function NestedOptionsPage({
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
  const storeDiscount = defaults.force_hq_campaign ? defaults.discount : (store.discount_rate ?? defaults.discount);
  const { optionDiscount, showOptionBanner, globalPriceBlur } = resolveOptionsConfig(store, storeDiscount);
  const basePath = `/${slug}/${subSlug}`;

  return (
    <OptionsBody
      store={store}
      basePath={basePath}
      optionDiscount={optionDiscount}
      showOptionBanner={showOptionBanner}
      globalPriceBlur={globalPriceBlur}
    />
  );
}
