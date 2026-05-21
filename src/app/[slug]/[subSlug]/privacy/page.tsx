import { notFound } from 'next/navigation';
import { getStoreBySlug } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { PrivacyBody } from '@/app/[slug]/(chrome)/privacy/PrivacyBody';

export default async function NestedPrivacyPage({
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
  const basePath = `/${slug}/${subSlug}`;

  return <PrivacyBody store={store} basePath={basePath} displayName={store.store_name} />;
}
