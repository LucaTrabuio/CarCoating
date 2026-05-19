import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mintPiiCookie, PII_COOKIE_NAME } from '@/lib/pii-session';
import { stepUpSchema } from '@/lib/validations';
import { firestoreRateLimit } from '@/lib/rate-limit-firestore';
import { getClientIp } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { allowed } = await firestoreRateLimit({
    key: `stepup:${auth.user.uid}`,
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = stepUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { method } = parsed.data;

  // The actual Firebase credential re-auth happens client-side.
  // This endpoint trusts that the client completed it (Firebase SDK validates it).
  // Server just mints the PII session cookie.
  if (method !== 'password' && method !== 'google-recent-auth') {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  }

  try {
    const piiCookie = mintPiiCookie(auth.user.uid);
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieStore = await cookies();
    cookieStore.set(PII_COOKIE_NAME, piiCookie.value, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('step-up failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
