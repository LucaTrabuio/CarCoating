'use client';

import { useParams } from 'next/navigation';
import { ReviewsBody } from '@/app/[slug]/(chrome)/reviews/ReviewsBody';

export default function V3ReviewsPage() {
  const { slug } = useParams<{ slug: string }>();
  return <ReviewsBody basePath={`/${slug}`} />;
}
