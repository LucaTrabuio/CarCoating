import { notFound } from 'next/navigation';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import { NewsBody } from './NewsBody';

export default async function V3NewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();

  return <NewsBody store={resolved.store} basePath={`/${slug}`} />;
}
