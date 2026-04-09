import { notFound } from 'next/navigation';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import type { Metadata } from 'next';
import PriceContent from './PriceContent';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) return {};
  const name = resolved.subCompanyName ?? resolved.store.store_name;
  return {
    title: `料金シミュレーター｜${name}｜KeePer PRO SHOP`,
    description: `${name}のカーコーティング料金を車種から簡単シミュレーション。Web予約限定割引あり。`,
  };
}

export default async function V3StorePricePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();

  return <PriceContent store={resolved.store} />;
}
