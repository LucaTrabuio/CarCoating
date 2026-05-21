import { notFound } from 'next/navigation';
import { getV3StoreById, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import { SingleStoreAccess, StoreAccessCard } from './AccessBody';

export default async function V3AccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Single store case
  const store = await getV3StoreById(slug);
  if (store && store.is_active) {
    return <SingleStoreAccess store={store} />;
  }

  // Sub-company case — show all stores
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    const stores = await getStoresBySubCompany(subCompany.id);
    if (stores.length === 0) notFound();

    return (
      <main>
        <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--site-font, "Noto Sans JP", sans-serif)' }}>店舗一覧・アクセス</h1>
          <p className="text-white/40 text-sm mt-1">{subCompany.name}</p>
          <p className="text-white/30 text-xs mt-2">{stores.length}店舗</p>
        </section>
        <section className="py-10 px-5 space-y-6">
          <div className="max-w-[1100px] mx-auto space-y-6">
            {stores.map(s => (
              <StoreAccessCard key={s.store_id} store={s} />
            ))}
          </div>
        </section>
      </main>
    );
  }

  notFound();
}
