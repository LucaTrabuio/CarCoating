import type {
  PageBlock,
  HeroConfig,
  StoreIntroConfig,
  StaffPhotoConfig,
  BeforeAfterConfig,
  GalleryConfig,
  USPConfig,
  ConcernsConfig,
  CasesConfig,
  PricingConfig,
  NewsConfig,
  ProcessConfig,
  BenefitsConfig,
  AccessConfig,
  CTAConfig,
  CertificationsConfig,
  AppealPointsConfig,
  BannersConfig,
  CustomHtmlConfig,
} from '@/lib/block-types';
import type { V3StoreData } from '@/lib/v3-types';
import type { MasterAppealPoint } from '@/lib/master-data';
import HeroBlock from './HeroBlock';
import StoreIntroBlock from './StoreIntroBlock';
import StaffPhotoBlock from './StaffPhotoBlock';
import BeforeAfterBlock from './BeforeAfterBlock';
import GalleryBlock from './GalleryBlock';
import USPBlock from './USPBlock';
import ConcernsBlock from './ConcernsBlock';
import QuizBlock from './QuizBlock';
import SimulatorBlock from './SimulatorBlock';
import CasesBlock from './CasesBlock';
import PricingBlock from './PricingBlock';
import NewsBlock from './NewsBlock';
import ProcessBlock from './ProcessBlock';
import BenefitsBlock from './BenefitsBlock';
import AccessBlock from './AccessBlock';
import CTABlock from './CTABlock';
import CertificationsBlock from './CertificationsBlock';
import AppealPointsBlock from './AppealPointsBlock';
import BannersBlock from './BannersBlock';
import CustomHtmlBlock from './CustomHtmlBlock';

interface BlockRendererProps {
  block: PageBlock;
  store: V3StoreData;
  basePath: string;
  discountRate: number;
  allStores?: V3StoreData[];
  appealPointsMaster?: Record<string, MasterAppealPoint>;
}

export default function BlockRenderer({ block, store, basePath, discountRate, allStores, appealPointsMaster }: BlockRendererProps) {
  if (!block.visible) return null;

  switch (block.type) {
    case 'hero':
      return <HeroBlock config={block.config as HeroConfig} store={store} basePath={basePath} />;
    case 'store_intro':
      return <StoreIntroBlock config={block.config as StoreIntroConfig} store={store} />;
    case 'staff_photo':
      return <StaffPhotoBlock config={block.config as StaffPhotoConfig} store={store} />;
    case 'before_after':
      return <BeforeAfterBlock config={block.config as BeforeAfterConfig} store={store} basePath={basePath} />;
    case 'gallery':
      return <GalleryBlock config={block.config as GalleryConfig} store={store} />;
    case 'usp':
      return <USPBlock config={block.config as USPConfig} />;
    case 'concerns':
      return <ConcernsBlock config={block.config as ConcernsConfig} />;
    case 'quiz':
      return <QuizBlock storeId={store.store_id} basePath={basePath} />;
    case 'simulator':
      return <SimulatorBlock store={store} basePath={basePath} />;
    case 'cases':
      return <CasesBlock config={block.config as CasesConfig} basePath={basePath} />;
    case 'pricing':
      return <PricingBlock config={block.config as PricingConfig} store={store} basePath={basePath} discountRate={discountRate} />;
    case 'news':
      return <NewsBlock config={block.config as NewsConfig} store={store} />;
    case 'process':
      return <ProcessBlock config={block.config as ProcessConfig} />;
    case 'benefits':
      return <BenefitsBlock config={block.config as BenefitsConfig} basePath={basePath} discountRate={discountRate} />;
    case 'access':
      return <AccessBlock config={block.config as AccessConfig} store={store} basePath={basePath} />;
    case 'cta':
      return <CTABlock config={block.config as CTAConfig} store={store} allStores={allStores} />;
    case 'certifications':
      return <CertificationsBlock config={block.config as CertificationsConfig} />;
    case 'appeal_points':
      return <AppealPointsBlock config={block.config as AppealPointsConfig} store={store} appealPointsMaster={appealPointsMaster} />;
    case 'banners':
      return <BannersBlock config={block.config as BannersConfig} />;
    case 'custom_html':
      return <CustomHtmlBlock config={block.config as CustomHtmlConfig} />;
    default:
      return null;
  }
}
