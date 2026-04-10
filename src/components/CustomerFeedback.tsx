'use client';

import { useState, useEffect } from 'react';
import type { V3StoreData } from '@/lib/v3-types';

interface CustomerFeedbackProps {
  store: V3StoreData;
  googlePlaceId?: string;
}

interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
}

interface Testimonial {
  name: string;
  carModel: string;
  comment: string;
  rating: number;
}

const STATIC_TESTIMONIALS: Testimonial[] = [
  {
    name: 'S.T. 様',
    carModel: 'トヨタ アルファード',
    comment:
      '仕上がりに大満足です。新車以上の輝きで、家族も驚いていました。スタッフの方の説明も丁寧でした。',
    rating: 5,
  },
  {
    name: 'K.M. 様',
    carModel: 'BMW 3シリーズ',
    comment:
      '3年経っても艶が持続しています。メンテナンスに来るたびにピカピカになって嬉しいです。',
    rating: 5,
  },
  {
    name: 'A.Y. 様',
    carModel: 'ホンダ N-BOX',
    comment:
      '軽自動車でも丁寧に施工してもらえました。洗車の回数が減って楽になりました。コスパ最高です。',
    rating: 4,
  },
];

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className={`flex gap-0.5 ${sizeClass}`} aria-label={`${rating}つ星`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? 'text-amber-400' : 'text-slate-200'}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

export default function CustomerFeedback({
  store,
  googlePlaceId,
}: CustomerFeedbackProps) {
  const placeId = googlePlaceId || store.google_place_id;
  const [reviewData, setReviewData] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    if (!placeId) return;

    let cancelled = false;
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/reviews/${placeId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setReviewData({
            average_rating: data.average_rating ?? data.rating ?? 0,
            total_reviews: data.total_reviews ?? data.user_ratings_total ?? 0,
          });
        }
      } catch {
        // silently fail — reviews are optional
      }
    }

    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#0C3290] text-xs font-bold tracking-widest mb-2">
            VOICE
          </p>
          <h2
            className="text-xl md:text-2xl font-bold text-[#0C3290]"
            style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
          >
            お客様の声
          </h2>
        </div>

        {/* Google review score */}
        {reviewData && reviewData.average_rating > 0 && (
          <div className="flex items-center justify-center gap-3 mb-8 bg-slate-50 rounded-xl py-4 px-6">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-bold text-[#0C3290]">Google</span>
            </div>
            <StarRating rating={Math.round(reviewData.average_rating)} />
            <span className="text-lg font-bold text-[#0C3290]">
              {reviewData.average_rating.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">
              ({reviewData.total_reviews}件のレビュー)
            </span>
          </div>
        )}

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {STATIC_TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-slate-50 rounded-xl p-5 border border-slate-100"
            >
              <StarRating rating={t.rating} size="sm" />
              <p className="text-[13px] text-[#0C3290] leading-relaxed mt-3 mb-4">
                &ldquo;{t.comment}&rdquo;
              </p>
              <div className="border-t border-slate-200 pt-3">
                <p className="text-sm font-bold text-[#0C3290]">{t.name}</p>
                <p className="text-xs text-slate-400">{t.carModel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
