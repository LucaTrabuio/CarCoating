'use client';

import type { AreaBannerRef, StoreForBanners } from '@/lib/area-blocks';
import { resolveAreaBannerRefs } from '@/lib/area-blocks';
import BannersBlock from '@/components/blocks/BannersBlock';

interface Props {
  refs: AreaBannerRef[];
  stores: StoreForBanners[];
}

export default function AreaBannersBlock({ refs, stores }: Props) {
  const resolved = resolveAreaBannerRefs(stores, refs);
  if (resolved.length === 0) return null;

  return (
    <BannersBlock config={{ banners: resolved }} />
  );
}
