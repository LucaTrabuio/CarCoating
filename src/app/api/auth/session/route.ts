import { NextResponse, type NextRequest } from 'next/server';
import { createSessionCookie } from '@/lib/auth';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { mintAdminActive, ADMIN_ACTIVE_COOKIE } from '@/lib/admin-active';

// POST: Create session cookie from Firebase ID token
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`session:${ip}`, 10);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Verify the token to get user info
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Check if user has custom claims (role). If not, check Firestore.
    if (!decoded.role) {
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(decoded.uid).get();

      if (userDoc.exists) {
        // User exists in Firestore but claims not set yet — set them
        const userData = userDoc.data()!;
        await adminAuth.setCustomUserClaims(decoded.uid, {
          role: userData.role || 'store_admin',
          managed_stores: userData.managed_stores || [],
        });
      } else {
        // New Google sign-in user with no Firestore record — deny access
        return NextResponse.json(
          { error: 'アカウントが登録されていません。管理者にお問い合わせください。' },
          { status: 403 }
        );
      }
    }

    const sessionCookie = await createSessionCookie(idToken);
    const cookieStore = await cookies();

    cookieStore.set('__session', sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14, // 14 days
    });

    // Read user doc for password policy fields, then mint Layer-2 cookie
    try {
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      const userData = userDoc.exists ? userDoc.data()! : {};
      const role = userData.role || decoded.role || 'store_admin';
      const adminActiveCookie = await mintAdminActive({
        uid: decoded.uid,
        email: decoded.email || '',
        role,
        passwordChangedAt: userData.passwordChangedAt || null,
        mustChangePassword: userData.mustChangePassword === true,
      });
      cookieStore.set(ADMIN_ACTIVE_COOKIE, adminActiveCookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      });
    } catch (adminActiveErr) {
      console.error('Failed to mint __admin_active cookie:', adminActiveErr);
      // Non-fatal — Layer 2 check in proxy handles missing cookie gracefully
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session creation failed:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

// DELETE: Clear session cookie (logout)
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('__session');
  return NextResponse.json({ success: true });
}
