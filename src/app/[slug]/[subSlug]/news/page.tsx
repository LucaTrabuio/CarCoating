import { notFound } from 'next/navigation';
import { getStoreBySlug } from '@/lib/firebase-stores';
import { getGlobalDefaults, applyDefaults } from '@/lib/global-defaults';
import { NewsBody } from '@/app/[slug]/(chrome)/news/NewsBody';

export default async function NestedNewsPage({
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

  return <NewsBody store={store} basePath={basePath} />;
}
