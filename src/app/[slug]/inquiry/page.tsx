import { notFound } from 'next/navigation';
import { resolveSlugToStore, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import { getMasterCoatingTiers } from '@/lib/master-data';
import InquiryForm from '@/components/InquiryForm';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  const storeName = resolved?.subCompanyName ?? resolved?.store.store_name ?? 'KeePer PRO SHOP';
  return {
    title: `お問い合わせ｜${storeName}`,
    description: `${storeName}のカーコーティングに関するお問い合わせ・料金のご相談。`,
  };
}

export default async function InquiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tier?: string }>;
}) {
  const { slug } = await params;
  const { tier: preselectedTier } = await searchParams;

  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();

  const tiers = await getMasterCoatingTiers();

  // Check if this is a multi-store sub-company
  const subCompany = await getSubCompanyBySlug(slug);
  let allStores = [resolved.store];
  if (subCompany) {
    const stores = await getStoresBySubCompany(subCompany.id);
    if (stores.length > 1) allStores = stores;
  }

  return (
    <main>
      <section className="bg-[#0f1c2e] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          お問い合わせ
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {resolved.subCompanyName || resolved.store.store_name}
        </p>
        <p className="text-white/30 text-xs mt-2">
          料金やサービスに関するご質問をお気軽にどうぞ。
        </p>
      </section>
      <InquiryForm
        store={resolved.store}
        stores={allStores.length > 1 ? allStores : undefined}
        tiers={tiers}
        preselectedTier={preselectedTier}
      />
    </main>
  );
}
