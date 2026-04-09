import { notFound } from 'next/navigation';
import { getV3StoreById } from '@/lib/firebase-stores';
import type { Metadata } from 'next';
import ReservationForm from '@/components/ReservationForm';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store) return {};
  return {
    title: `ご予約｜${store.store_name}｜KeePer PRO SHOP`,
    description: `${store.store_name}のカーコーティングご予約・お問い合わせ。Web予約限定割引あり。`,
  };
}

export default async function V3BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storeId } = await params;
  const store = await getV3StoreById(storeId);
  if (!store || !store.is_active) notFound();

  return (
    <main>
      <section className="bg-[#0f1c2e] py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご予約</h1>
        <p className="text-white/40 text-sm mt-1">{store.store_name}</p>
        <p className="text-white/30 text-xs mt-2">ご希望の日時を3つお選びください。店舗より確認のご連絡をいたします。</p>
      </section>
      <ReservationForm store={store} />
    </main>
  );
}
