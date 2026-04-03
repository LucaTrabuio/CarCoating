import { getDefaultCampaign } from '@/lib/store-data';
import DynamicBanner from '@/components/DynamicBanner';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const campaign = getDefaultCampaign();

  return (
    <>
      <SiteHeader />
      <div className="pt-[52px]">
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
