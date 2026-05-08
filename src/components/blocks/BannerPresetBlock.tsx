import type { BannerPresetConfig } from '@/lib/block-types';
import BannersBlock from './BannersBlock';

interface BannerPresetBlockProps {
  config: BannerPresetConfig;
}

/**
 * Standalone banner block rendering a single snapshotted preset. Delegates to
 * BannersBlock so html/css/discount rendering logic stays in one place.
 */
export default function BannerPresetBlock({ config }: BannerPresetBlockProps) {
  const banner = config?.banner;
  if (!banner || !banner.visible) return null;
  return <BannersBlock config={{ banners: [banner] }} />;
}
