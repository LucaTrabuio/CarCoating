'use client';

import type { HomepageBlock } from '@/lib/homepage-blocks';
import ScrollFadeIn from '@/components/ScrollFadeIn';
import HeroHomeBlock from './HeroHomeBlock';
import ServiceMenuBlock from './ServiceMenuBlock';
import WhyKeeperBlock from './WhyKeeperBlock';
import StoreGalleryBlock from './StoreGalleryBlock';
import StoreFinderBlock from './StoreFinderBlock';
import BlogSectionBlock from './BlogSectionBlock';
import NewsHomeBlock from './NewsHomeBlock';
import ProcessHomeBlock from './ProcessHomeBlock';
import CtaHomeBlock from './CtaHomeBlock';

interface Props {
  blocks: HomepageBlock[];
}

export default function HomepageBlockRenderer({ blocks }: Props) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <main>
      {sorted.map(block => {
        if (!block.visible) return null;

        switch (block.type) {
          case 'hero_home': {
            const cfg = block.config as {
              title?: string; subtitle?: string; description?: string;
              cta_primary_text?: string; cta_primary_link?: string;
              cta_secondary_text?: string; cta_secondary_link?: string;
            };
            return <HeroHomeBlock key={block.id} config={cfg} />;
          }

          case 'service_menu':
            return (
              <ScrollFadeIn key={block.id}>
                <ServiceMenuBlock />
              </ScrollFadeIn>
            );

          case 'why_keeper':
            return (
              <ScrollFadeIn key={block.id}>
                <WhyKeeperBlock />
              </ScrollFadeIn>
            );

          case 'store_gallery':
            return (
              <ScrollFadeIn key={block.id}>
                <StoreGalleryBlock />
              </ScrollFadeIn>
            );

          case 'store_finder':
            return (
              <ScrollFadeIn key={block.id}>
                <StoreFinderBlock />
              </ScrollFadeIn>
            );

          case 'blog_section': {
            const cfg = block.config as { max_articles?: number; heading?: string };
            return (
              <ScrollFadeIn key={block.id}>
                <BlogSectionBlock maxArticles={cfg.max_articles} heading={cfg.heading} />
              </ScrollFadeIn>
            );
          }

          case 'news_home': {
            const cfg = block.config as { max_items?: number; heading?: string };
            return (
              <ScrollFadeIn key={block.id}>
                <NewsHomeBlock maxItems={cfg.max_items} heading={cfg.heading} />
              </ScrollFadeIn>
            );
          }

          case 'process_home':
            return (
              <ScrollFadeIn key={block.id}>
                <ProcessHomeBlock />
              </ScrollFadeIn>
            );

          case 'cta_home': {
            const cfg = block.config as { heading?: string; description?: string; button_text?: string; button_link?: string };
            return (
              <ScrollFadeIn key={block.id}>
                <CtaHomeBlock heading={cfg.heading} description={cfg.description} button_text={cfg.button_text} button_link={cfg.button_link} />
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
