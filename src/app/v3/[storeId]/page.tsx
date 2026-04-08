import { notFound } from 'next/navigation';
import { getV3StoreById, getV3CampaignDefaults } from '@/lib/firebase-stores';
import { parsePageLayout } from '@/lib/block-types';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import PageViewTracker from '@/components/PageViewTracker';

export default async function V3StoreHomePage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store || !store.is_active) notFound();

  const defaults = await getV3CampaignDefaults();
  const discountRate = store.discount_rate || defaults.discount;
  const basePath = `/v3/${storeId}`;

  const layout = parsePageLayout(store.page_layout, store);

  return (
    <main>
      <PageViewTracker storeId={storeId} />
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
