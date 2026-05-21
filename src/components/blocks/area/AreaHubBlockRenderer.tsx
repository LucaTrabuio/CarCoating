'use client';

import type { AreaBlock } from '@/lib/area-blocks';
import { aggregateCoatings, aggregateOptions } from '@/lib/area-blocks';
import type { CoatingTier } from '@/lib/types';
import type { ServiceOption } from '@/data/service-options';
import type { AreaNewsItem } from './AreaNewsBlock';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import AreaHeaderBlock from './AreaHeaderBlock';
import AreaStoreMapBlock from './AreaStoreMapBlock';
import AggregatedCoatingsBlock from './AggregatedCoatingsBlock';
import AggregatedOptionsBlock from './AggregatedOptionsBlock';
import AreaNewsBlock from './AreaNewsBlock';
import BlogSectionBlock from '@/components/blocks/homepage/BlogSectionBlock';

export interface AreaStoreContext {
  store_id: string;
  store_name: string;
  address: string;
  tel: string;
  business_hours: string;
  regular_holiday: string;
  parking_spaces: number;
  landmark: string;
  nearby_stations: string;
  has_booth: boolean;
  lat: number;
  lng: number;
  store_news: string;
  custom_services: string;
  offered_coatings?: string[];
}

export interface AreaContext {
  subCompanyName: string;
  stores: AreaStoreContext[];
  coatingTiers: CoatingTier[];
  serviceOptions: ServiceOption[];
}

interface Props {
  blocks: AreaBlock[];
  context: AreaContext;
}

function buildNewsItems(stores: AreaStoreContext[]): AreaNewsItem[] {
  const items: AreaNewsItem[] = [];
  for (const store of stores) {
    let newsItems: { id: string; title: string; date: string; visible: boolean }[] = [];
    try {
      const parsed = JSON.parse(store.store_news || '[]');
      if (Array.isArray(parsed)) newsItems = parsed;
    } catch {
      /* skip */
    }
    for (const item of newsItems) {
      if (!item.visible) continue;
      items.push({
        id: `${store.store_id}-${item.id}`,
        title: item.title,
        date: item.date,
        storeId: store.store_id,
        storeName: store.store_name,
      });
    }
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export default function AreaHubBlockRenderer({ blocks, context }: Props) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const coatingRows = aggregateCoatings(context.stores, context.coatingTiers);
  const optionRows = aggregateOptions(context.stores, context.serviceOptions);
  const newsItems = buildNewsItems(context.stores);

  return (
    <main>
      {sorted.map(block => {
        if (!block.visible) return null;

        switch (block.type) {
          case 'area_header':
            return (
              <AreaHeaderBlock
                key={block.id}
                groupName={context.subCompanyName}
                storeCount={context.stores.length}
              />
            );

          case 'area_store_map':
            return (
              <ScrollFadeIn key={block.id}>
                <AreaStoreMapBlock
                  stores={context.stores}
                  groupName={context.subCompanyName}
                />
              </ScrollFadeIn>
            );

          case 'aggregated_coatings':
            return (
              <ScrollFadeIn key={block.id}>
                <AggregatedCoatingsBlock rows={coatingRows} />
              </ScrollFadeIn>
            );

          case 'aggregated_options':
            return (
              <ScrollFadeIn key={block.id}>
                <AggregatedOptionsBlock rows={optionRows} />
              </ScrollFadeIn>
            );

          case 'area_news': {
            const cfg = block.config as { max_items?: number };
            return (
              <ScrollFadeIn key={block.id}>
                <AreaNewsBlock items={newsItems} maxItems={cfg.max_items} />
              </ScrollFadeIn>
            );
          }

          case 'columns': {
            const cfg = block.config as { max_articles?: number; heading?: string };
            return (
              <ScrollFadeIn key={block.id}>
                <BlogSectionBlock maxArticles={cfg.max_articles} heading={cfg.heading} />
              </ScrollFadeIn>
            );
          }

          default:
            return null;
        }
      })}
    </main>
  );
}
