import { NextResponse } from 'next/server';
import { GoogleReview } from '@/lib/types';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const PLACE_ID_RE = /^[A-Za-z0-9_-]{16,256}$/;

// Google Places API integration
// Set GOOGLE_PLACES_API_KEY in .env.local for live reviews
// Falls back to sample data when API key is not configured

const SAMPLE_REVIEWS: GoogleReview[] = [
  {
    author_name: 'T.S.',
    rating: 5,
    text: '初めてコーティングをお願いしましたが、仕上がりに大変満足しています。スタッフの方の説明も丁寧で安心できました。',
    time: Date.now() / 1000 - 86400 * 30,
    relative_time_description: '1ヶ月前',
  },
  {
    author_name: 'M.K.',
    rating: 5,
    text: '3年目のハリアーにダイヤモンドキーパーを施工。新車以上の輝きで驚きました。妻も「また新車買ったの？」と笑っていました。',
    time: Date.now() / 1000 - 86400 * 60,
    relative_time_description: '2ヶ月前',
  },
  {
    author_name: 'Y.T.',
    rating: 4,
    text: '仕上がりは文句なし。予約から施工まで丁寧に対応していただきました。駐車場が少し狭いのが唯一の難点。',
    time: Date.now() / 1000 - 86400 * 90,
    relative_time_description: '3ヶ月前',
  },
  {
    author_name: 'A.N.',
    rating: 5,
    text: 'EXキーパーを施工して半年経ちますが、水洗いだけで新車のような輝きが維持できています。コスパ最高です。',
    time: Date.now() / 1000 - 86400 * 120,
    relative_time_description: '4ヶ月前',
  },
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (apiKey && placeId && !placeId.startsWith('ChIJ_example') && PLACE_ID_RE.test(placeId)) {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`reviews:${ip}`, 30);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total,reviews&language=ja&key=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
      const data = await res.json();

      if (data.result) {
        return NextResponse.json({
          rating: data.result.rating || 0,
          total_reviews: data.result.user_ratings_total || 0,
          reviews: (data.result.reviews || []).map((r: Record<string, unknown>) => ({
            author_name: r.author_name,
            rating: r.rating,
            text: r.text,
            time: r.time,
            relative_time_description: r.relative_time_description,
          })),
        });
      }
    } catch (error) {
      console.error('Google Places API error:', error);
    }
  }

  // Fallback to sample data
  return NextResponse.json({
    rating: 4.8,
    total_reviews: 47,
    reviews: SAMPLE_REVIEWS,
  });
}
