import { notFound } from 'next/navigation';
import { getV3StoreById } from '@/lib/firebase-stores';
import type { Metadata } from 'next';
import PriceContent from './PriceContent';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store) return {};
  return {
    title: `料金シミュレーター｜${store.store_name}｜KeePer PRO SHOP`,
    description: `${store.store_name}のカーコーティング料金を車種から簡単シミュレーション。Web予約限定割引あり。`,
  };
}

export default async function V3StorePricePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store || !store.is_active) notFound();

  return <PriceContent store={store} />;
}
