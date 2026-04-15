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
import ScrollFadeIn from '@/components/ScrollFadeIn';
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
import PromoBannersBlock from './PromoBannersBlock';

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

  // Hero renders immediately without fade-in (above the fold), followed by promo banners
  if (block.type === 'hero') {
    return (
      <>
        <HeroBlock config={block.config as HeroConfig} store={store} basePath={basePath} />
        <PromoBannersBlock />
      </>
    );
  }

  let content: React.ReactNode = null;

  switch (block.type) {
    case 'store_intro':
      content = <StoreIntroBlock config={block.config as StoreIntroConfig} store={store} />;
      break;
    case 'staff_photo':
      content = <StaffPhotoBlock config={block.config as StaffPhotoConfig} store={store} />;
      break;
    case 'before_after':
      content = <BeforeAfterBlock config={block.config as BeforeAfterConfig} store={store} basePath={basePath} />;
      break;
    case 'gallery':
      content = <GalleryBlock config={block.config as GalleryConfig} store={store} />;
      break;
    case 'usp':
      content = <USPBlock config={block.config as USPConfig} basePath={basePath} />;
      break;
    case 'concerns':
      content = <ConcernsBlock config={block.config as ConcernsConfig} />;
      break;
    case 'quiz':
      content = <QuizBlock storeId={store.store_id} basePath={basePath} />;
      break;
    case 'simulator':
      content = <SimulatorBlock store={store} basePath={basePath} />;
      break;
    case 'cases':
      content = <CasesBlock config={block.config as CasesConfig} basePath={basePath} />;
      break;
    case 'pricing':
      content = <PricingBlock config={block.config as PricingConfig} store={store} basePath={basePath} discountRate={discountRate} />;
      break;
    case 'news':
      content = <NewsBlock config={block.config as NewsConfig} store={store} basePath={basePath} />;
      break;
    case 'process':
      content = <ProcessBlock config={block.config as ProcessConfig} />;
      break;
    case 'benefits':
      content = <BenefitsBlock config={block.config as BenefitsConfig} basePath={basePath} discountRate={discountRate} />;
      break;
    case 'access':
      content = <AccessBlock config={block.config as AccessConfig} store={store} basePath={basePath} />;
      break;
    case 'cta':
      content = <CTABlock config={block.config as CTAConfig} store={store} allStores={allStores} />;
      break;
    case 'certifications':
      content = <CertificationsBlock config={block.config as CertificationsConfig} />;
      break;
    case 'appeal_points':
      content = <AppealPointsBlock config={block.config as AppealPointsConfig} store={store} appealPointsMaster={appealPointsMaster} />;
      break;
    case 'banners':
      content = <BannersBlock config={block.config as BannersConfig} />;
      break;
    case 'custom_html':
      content = <CustomHtmlBlock config={block.config as CustomHtmlConfig} />;
      break;
    default:
      return null;
  }

  return <ScrollFadeIn>{content}</ScrollFadeIn>;
}
