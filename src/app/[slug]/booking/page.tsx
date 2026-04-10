import { notFound } from 'next/navigation';
import { getV3StoreById, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import type { Metadata } from 'next';
import ReservationForm from '@/components/ReservationForm';
import BookingStoreSelector from '@/components/BookingStoreSelector';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getV3StoreById(slug);
  if (store) {
    return {
      title: `ご予約｜${store.store_name}｜KeePer PRO SHOP`,
      description: `${store.store_name}のカーコーティングご予約・お問い合わせ。`,
    };
  }
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    return {
      title: `ご予約｜${subCompany.name}｜KeePer PRO SHOP`,
      description: `${subCompany.name}のカーコーティングご予約。`,
    };
  }
  return {};
}

export default async function V3BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Check sub-company first (multi-store groups win over colliding store_id)
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    const stores = await getStoresBySubCompany(subCompany.id);
    if (stores.length === 0) notFound();

    // Multi-store — show map + store selector before booking form
    if (stores.length > 1) {
      return (
        <main>
          <section className="bg-[#0C3290] py-12 px-5 text-center">
            <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>ご予約</h1>
            <p className="text-white/40 text-sm mt-1">{subCompany.name}</p>
            <p className="text-white/30 text-xs mt-2">まず店舗を選択してから、ご希望の日時をお選びください。</p>
          </section>
          <BookingStoreSelector stores={stores} groupName={subCompany.name} />
        </main>
      );
    }

    // Single-store sub-company — render booking form directly
    return (
      <main>
        <section className="bg-[#0C3290] py-12 px-5 text-center">
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>ご予約</h1>
          <p className="text-white/40 text-sm mt-1">{stores[0].store_name}</p>
        </section>
        <ReservationForm store={stores[0]} />
      </main>
    );
  }

  // Single store
  const store = await getV3StoreById(slug);
  if (store && store.is_active) {
    return (
      <main>
        <section className="bg-[#0C3290] py-12 px-5 text-center">
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>ご予約</h1>
          <p className="text-white/40 text-sm mt-1">{store.store_name}</p>
        </section>
        <ReservationForm store={store} />
      </main>
    );
  }

  notFound();
}
