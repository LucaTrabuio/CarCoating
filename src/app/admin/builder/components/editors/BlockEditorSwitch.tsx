'use client';

import type { PageBlock, HeroConfig, PricingConfig, USPConfig, CertificationsConfig, BannersConfig, CustomHtmlConfig } from '@/lib/block-types';
import HeroEditor from './HeroEditor';
import PricingEditor from './PricingEditor';
import USPEditor from './USPEditor';
import CertificationsEditor from './CertificationsEditor';
import BannersEditor from './BannersEditor';
import CustomHtmlEditor from './CustomHtmlEditor';
import GenericEditor from './GenericEditor';

interface BlockEditorSwitchProps {
  block: PageBlock;
  onUpdateConfig: (config: Record<string, unknown>) => void;
}

export default function BlockEditorSwitch({ block, onUpdateConfig }: BlockEditorSwitchProps) {
  switch (block.type) {
    case 'hero':
      return (
        <HeroEditor
          config={block.config as HeroConfig}
          onChange={(c) => onUpdateConfig(c as unknown as Record<string, unknown>)}
        />
      );
    case 'pricing':
      return (
        <PricingEditor
          config={block.config as PricingConfig}
          onChange={(c) => onUpdateConfig(c as unknown as Record<string, unknown>)}
        />
      );
    case 'usp':
      return (
        <USPEditor
          config={block.config as USPConfig}
          onChange={(c) => onUpdateConfig(c as unknown as Record<string, unknown>)}
        />
      );
    case 'certifications':
      return (
        <CertificationsEditor
          config={block.config as CertificationsConfig}
          onChange={(c) => onUpdateConfig(c as unknown as Record<string, unknown>)}
        />
      );
    case 'banners':
      return (
        <BannersEditor
          config={block.config as BannersConfig}
          onChange={(c) => onUpdateConfig(c as unknown as Record<string, unknown>)}
        />
      );
    case 'custom_html':
      return (
        <CustomHtmlEditor
          config={block.config as CustomHtmlConfig}
          onChange={(c) => onUpdateConfig(c as unknown as Record<string, unknown>)}
        />
      );
    default:
      return (
        <GenericEditor
          config={block.config as Record<string, unknown>}
          onChange={onUpdateConfig}
        />
      );
  }
}
