import { notFound } from 'next/navigation';
import { getV3StoreById, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
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

  // Resolve global defaults once so the reservation form sees the same
  // effective options (custom_services) as the rest of the storefront —
  // per-store overrides layered over the editable global catalog.
  const globalDefaults = await getGlobalDefaults();

  // Check sub-company first (multi-store groups win over colliding store_id)
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    const stores = (await getStoresBySubCompany(subCompany.id)).map(s => applyDefaults(s, globalDefaults));
    if (stores.length === 0) notFound();

    // Multi-store — show map + store selector before booking form
    if (stores.length > 1) {
      return (
        <main>
          <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
            <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>ご予約</h1>
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
        <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>ご予約</h1>
          <p className="text-white/40 text-sm mt-1">{stores[0].store_name}</p>
        </section>
        <ReservationForm store={stores[0]} />
      </main>
    );
  }

  // Single store
  const rawStore = await getV3StoreById(slug);
  if (rawStore && rawStore.is_active) {
    const store = applyDefaults(rawStore, globalDefaults);
    return (
      <main>
        <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>ご予約</h1>
          <p className="text-white/40 text-sm mt-1">{store.store_name}</p>
        </section>
        <ReservationForm store={store} />
      </main>
    );
  }

  notFound();
}
