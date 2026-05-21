'use client';

import { useParams } from 'next/navigation';
import { CasesBody } from '@/app/[slug]/(chrome)/cases/CasesBody';

export default function NestedCasesPage() {
  const { slug, subSlug } = useParams<{ slug: string; subSlug: string }>();
  return <CasesBody basePath={`/${slug}/${subSlug}`} domainKey={slug} />;
}
