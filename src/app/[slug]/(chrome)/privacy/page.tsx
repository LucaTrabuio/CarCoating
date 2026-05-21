import { notFound } from 'next/navigation';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import { PrivacyBody } from './PrivacyBody';

export default async function V3PrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();

  const displayName = resolved.subCompanyName || resolved.store.store_name;

  return <PrivacyBody store={resolved.store} basePath={`/${slug}`} displayName={displayName} />;
}
