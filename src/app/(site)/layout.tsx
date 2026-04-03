import { getDefaultCampaign } from '@/lib/store-data';
import FixedCTABar from '@/components/FixedCTABar';
import DynamicBanner from '@/components/DynamicBanner';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const campaign = getDefaultCampaign();

  return (
    <>
      <FixedCTABar />
      <SiteHeader />
      <div className="pt-[88px]">
        <DynamicBanner
          title={campaign.title}
          discountRate={20}
          deadline={campaign.deadline}
          colorCode={campaign.color}
        />
      </div>
      {children}
      <SiteFooter />
    </>
  );
}
