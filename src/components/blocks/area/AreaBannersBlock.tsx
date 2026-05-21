'use client';

import type { AreaBannerRef, StoreForBanners } from '@/lib/area-blocks';
import { resolveAreaBanners } from '@/lib/area-blocks';
import PromoBannersBlock from '@/components/blocks/PromoBannersBlock';

interface Props {
  refs: AreaBannerRef[];
  stores: StoreForBanners[];
}

export default function AreaBannersBlock({ refs, stores }: Props) {
  // Curated refs win; otherwise fall back to the area's carousel banners so an
  // un-curated hub still shows the shops' banners instead of an empty section.
  const resolved = resolveAreaBanners(stores, refs);
  if (resolved.length === 0) return null;

  // Render in the same drifting carousel used on store pages.
  const slots = resolved.map(b => ({ src: b.image_url, alt: b.title }));
  return <PromoBannersBlock banners={slots} />;
}
