import { notFound } from 'next/navigation';
import { getV3StoreById, getV3CampaignDefaults, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import { parsePageLayout } from '@/lib/block-types';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import PageViewTracker from '@/components/PageViewTracker';
import { getMasterAppealPoints, getMasterCoatingTiers } from '@/lib/master-data';
import CoatingComparisonSection from '@/components/CoatingCard/CoatingComparisonSection';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { getAreaLayout } from '@/lib/area-layout';
import AreaHubBlockRenderer, { type AreaContext } from '@/components/blocks/area/AreaHubBlockRenderer';
import { DEFAULT_SERVICE_OPTIONS } from '@/lib/area-blocks';

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Fetch independent data in parallel; getV3CampaignDefaults was being called up to 3x sequentially.
  const [appealPointsMaster, subCompany, rawStore, defaults, globalDefaults, coatingTiers] = await Promise.all([
    getMasterAppealPoints(),
    getSubCompanyBySlug(slug),
    getV3StoreById(slug),
    getV3CampaignDefaults(),
    getGlobalDefaults(),
    getMasterCoatingTiers(),
  ]);
  // Resolve every defaultable section (page_layout, banners, staff_members, …)
  // against the global-defaults + override-flags policy.
  const store = rawStore ? applyDefaults(rawStore, globalDefaults) : null;

  // Check sub-company first so multi-store groups (>1 store) win
  // over a single store that shares the same slug (e.g., "fussa").
  if (subCompany) {
    const rawStores = await getStoresBySubCompany(subCompany.id);
    const stores = rawStores.map(s => applyDefaults(s, globalDefaults));
    if (stores.length > 1) {
      // Multi-store sub-company — render via area hub block system
      const areaLayout = await getAreaLayout(subCompany.id);
      const areaContext: AreaContext = {
        subCompanyName: subCompany.name,
        stores: stores.map(s => ({
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
          store_news: s.store_news ?? '',
          custom_services: s.custom_services ?? '',
          offered_coatings: undefined,
        })),
        coatingTiers,
        serviceOptions: DEFAULT_SERVICE_OPTIONS,
      };
      return <AreaHubBlockRenderer blocks={areaLayout} context={areaContext} />;
    }
  }

  // Single store (or single-store sub-company with matching store_id)
  if (store && store.is_active) {
    let discountRate = defaults.force_hq_campaign ? defaults.discount : (store.discount_rate ?? defaults.discount);
    if (defaults.end && new Date(defaults.end) < new Date()) discountRate = 0;
    const basePath = `/${slug}`;
    const layout = parsePageLayout(store.page_layout, store);

    // If this single store belongs to a sub-company, surface its sibling
    // stores so the access map can show every store in the same area
    // (matches the multi-store sub-company branch above).
    let siblingStores: typeof store[] | undefined;
    if (store.sub_company_id) {
      try {
        const rawSiblings = await getStoresBySubCompany(store.sub_company_id);
        siblingStores = rawSiblings.map(s => applyDefaults(s, globalDefaults));
      } catch {
        siblingStores = undefined;
      }
    }

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
              allStores={siblingStores}
              appealPointsMaster={appealPointsMaster}
            />
          ))}
        <CoatingComparisonSection />
      </main>
    );
  }

  // Fallback: single-store sub-company whose store_id doesn't match the slug
  if (subCompany) {
    const rawStores = await getStoresBySubCompany(subCompany.id);
    const stores = rawStores.map(s => applyDefaults(s, globalDefaults));
    if (stores.length === 0) notFound();

    const areaLayout = await getAreaLayout(subCompany.id);
    const areaContext: AreaContext = {
      subCompanyName: subCompany.name,
      stores: stores.map(s => ({
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
        store_news: s.store_news ?? '',
        custom_services: s.custom_services ?? '',
        offered_coatings: undefined,
      })),
      coatingTiers,
      serviceOptions: DEFAULT_SERVICE_OPTIONS,
    };
    return <AreaHubBlockRenderer blocks={areaLayout} context={areaContext} />;
  }

  notFound();
}
