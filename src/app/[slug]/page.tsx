import { notFound } from 'next/navigation';
import { getV3StoreById, getV3CampaignDefaults, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import { parsePageLayout } from '@/lib/block-types';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import PageViewTracker from '@/components/PageViewTracker';
import SubCompanyStoreMap from '@/components/SubCompanyStoreMap';

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try store first
  const store = await getV3StoreById(slug);
  if (store && store.is_active) {
    const defaults = await getV3CampaignDefaults();
    const discountRate = store.discount_rate || defaults.discount;
    const basePath = `/${slug}`;
    const layout = parsePageLayout(store.page_layout, store);

    return (
      <main>
        <PageViewTracker storeId={slug} />
        {layout.blocks
          .filter(b => b.visible)
          .sort((a, b) => a.order - b.order)
          .map(block => (
            <BlockRenderer
              key={block.id}
              block={block}
              store={store}
              basePath={basePath}
              discountRate={discountRate}
            />
          ))}
      </main>
    );
  }

  // Try sub-company
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    const stores = await getStoresBySubCompany(subCompany.id);
    if (stores.length === 0) notFound();

    const primaryStore = stores[0];
    const defaults = await getV3CampaignDefaults();
    const basePath = `/${slug}`;

    const campaign = {
      title: primaryStore.campaign_title || defaults.title,
      discount_rate: primaryStore.discount_rate || defaults.discount,
      deadline: primaryStore.campaign_deadline || defaults.end,
      color: primaryStore.campaign_color_code || defaults.color,
    };

    const layout = parsePageLayout(primaryStore.page_layout, primaryStore);

    return (
      <main>
        {layout.blocks
          .filter(b => b.visible)
          .filter(b => b.type !== 'access') // Skip single-store access — SubCompanyStoreMap handles it
          .sort((a, b) => a.order - b.order)
          .map(block => (
            <BlockRenderer
              key={block.id}
              block={block}
              store={primaryStore}
              basePath={basePath}
              discountRate={campaign.discount_rate}
            />
          ))}
        <SubCompanyStoreMap
          stores={stores.map(s => ({
            store_id: s.store_id,
            store_name: s.store_name,
            address: s.address,
            tel: s.tel,
            business_hours: s.business_hours,
            regular_holiday: s.regular_holiday,
            parking_spaces: s.parking_spaces,
            landmark: s.landmark,
            nearby_stations: s.nearby_stations,
            has_booth: s.has_booth,
            lat: s.lat,
            lng: s.lng,
          }))}
          groupName={subCompany.name}
        />
      </main>
    );
  }

  notFound();
}
