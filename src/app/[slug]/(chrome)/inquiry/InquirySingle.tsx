import InquiryForm from '@/components/InquiryForm';
import type { V3StoreData } from '@/lib/v3-types';
import type { CoatingTier } from '@/lib/types';

interface SingleStoreInquiryProps {
  store: V3StoreData;
  tiers: CoatingTier[];
  preselectedTier?: string;
  prefillType?: string;
  displayName: string;
}

export function SingleStoreInquiry({ store, tiers, preselectedTier, prefillType, displayName }: SingleStoreInquiryProps) {
  return (
    <main>
      <section className="bg-[#0f1c2e] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, var(--font-noto-serif-jp), serif)' }}>
          お問い合わせ
        </h1>
        <p className="text-white/40 text-sm mt-1">{displayName}</p>
        <p className="text-white/30 text-xs mt-2">
          料金やサービスに関するご質問をお気軽にどうぞ。
        </p>
      </section>
      <InquiryForm
        store={store}
        tiers={tiers}
        preselectedTier={preselectedTier}
        prefillType={prefillType}
      />
    </main>
  );
}
