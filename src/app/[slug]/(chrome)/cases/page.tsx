'use client';

import { useParams } from 'next/navigation';
import { CasesBody } from '@/app/[slug]/(chrome)/cases/CasesBody';

export default function V3CasesPage() {
  const { slug } = useParams<{ slug: string }>();
  return <CasesBody basePath={`/${slug}`} domainKey={slug} />;
}
