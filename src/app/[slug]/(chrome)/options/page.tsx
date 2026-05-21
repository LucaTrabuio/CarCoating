import { notFound } from 'next/navigation';
import { resolveSlugToStore, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { OptionsBody, resolveOptionsConfig } from './OptionsBody';

export default async function V3OptionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();
  const globalDefaults = await getGlobalDefaults();
  const store = applyDefaults(resolved.store, globalDefaults);

  const defaults = await getV3CampaignDefaults();
  const storeDiscount = defaults.force_hq_campaign ? defaults.discount : (store.discount_rate ?? defaults.discount);
  const { optionDiscount, showOptionBanner, globalPriceBlur } = resolveOptionsConfig(store, storeDiscount);

  return (
    <OptionsBody
      store={store}
      basePath={`/${slug}`}
      optionDiscount={optionDiscount}
      showOptionBanner={showOptionBanner}
      globalPriceBlur={globalPriceBlur}
    />
  );
}
