import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getV3StoreById, getSubCompanyBySlug, getStoresBySubCompany } from '@/lib/firebase-stores';
import type { Metadata } from 'next';
import ReservationForm from '@/components/ReservationForm';

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

  // Single store case
  const store = await getV3StoreById(slug);
  if (store && store.is_active) {
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

  // Sub-company case — show store selector
  const subCompany = await getSubCompanyBySlug(slug);
  if (subCompany) {
    const stores = await getStoresBySubCompany(subCompany.id);
    if (stores.length === 0) notFound();

    // If only 1 store, auto-render its booking form
    if (stores.length === 1) {
      return (
        <main>
          <section className="bg-[#0f1c2e] py-12 px-5 text-center">
            <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご予約</h1>
            <p className="text-white/40 text-sm mt-1">{stores[0].store_name}</p>
          </section>
          <ReservationForm store={stores[0]} />
        </main>
      );
    }

    // Multiple stores — show selector
    return (
      <main>
        <section className="bg-[#0f1c2e] py-12 px-5 text-center">
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご予約</h1>
          <p className="text-white/40 text-sm mt-1">{subCompany.name}</p>
          <p className="text-white/30 text-xs mt-2">ご希望の店舗をお選びください</p>
        </section>
        <div className="py-10 px-5">
          <div className="max-w-[900px] mx-auto grid gap-3 sm:grid-cols-2">
            {stores.map(s => (
              <Link
                key={s.store_id}
                href={`/${s.store_id}/booking`}
                className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-amber-400 hover:shadow-md transition-all"
              >
                <div className="font-bold text-[#0f1c2e] text-base mb-1">{s.store_name}</div>
                {s.address && <div className="text-xs text-gray-500">{s.address}</div>}
                {s.tel && <div className="text-sm text-amber-600 font-bold mt-2">📞 {s.tel}</div>}
                {s.business_hours && <div className="text-xs text-gray-400 mt-1">営業時間: {s.business_hours}</div>}
                {s.regular_holiday && <div className="text-xs text-gray-400">定休日: {s.regular_holiday}</div>}
                <div className="text-xs text-amber-500 font-bold mt-3">この店舗で予約 →</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    );
  }

  notFound();
}
