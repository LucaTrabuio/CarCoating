'use client';

import { useParams } from 'next/navigation';
import { ReviewsBody } from '@/app/[slug]/(chrome)/reviews/ReviewsBody';

export default function NestedReviewsPage() {
  const { slug, subSlug } = useParams<{ slug: string; subSlug: string }>();
  return <ReviewsBody basePath={`/${slug}/${subSlug}`} />;
}
