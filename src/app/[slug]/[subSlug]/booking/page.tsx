import { notFound } from 'next/navigation';
import { getStoreBySlug } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { SingleStoreBooking } from '@/app/[slug]/(chrome)/booking/BookingSingle';

export default async function NestedBookingPage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;

  const [rawStore, globalDefaults] = await Promise.all([
    getStoreBySlug(slug, subSlug),
    getGlobalDefaults(),
  ]);

  if (!rawStore) notFound();

  const store = applyDefaults(rawStore, globalDefaults);

  return <SingleStoreBooking store={store} />;
}
