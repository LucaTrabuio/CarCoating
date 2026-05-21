import ReservationForm from '@/components/ReservationForm';
import type { V3StoreData } from '@/lib/v3-types';

export function SingleStoreBooking({ store }: { store: V3StoreData }) {
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
