import { notFound } from 'next/navigation';
import { getStoreBySlug } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { SingleStoreAccess } from '@/app/[slug]/(chrome)/access/AccessBody';

export default async function NestedAccessPage({
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

  return <SingleStoreAccess store={store} />;
}
