import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { hashToken } from '@/lib/tokens';
import { validatePassword } from '@/lib/password-policy';
import { sendPasswordChangedConfirmation } from '@/lib/admin-security-emails';
import { resetPasswordRequestSchema } from '@/lib/validations';
import { firestoreRateLimit } from '@/lib/rate-limit-firestore';
import { getClientIp } from '@/lib/rate-limit';

// GET: Validate that a reset token exists and is valid (for page pre-check)
// Public token-gated endpoint; reset-token possession is the auth factor. // eslint-disable-line car-coating/require-auth
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const token = req.nextUrl.searchParams.get('token') || '';

  const { allowed } = await firestoreRateLimit({
    key: `reset-get:${ip}`,
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const tokenHash = hashToken(token);
    const db = getAdminDb();
    const doc = await db.collection('passwordResetTokens').doc(tokenHash).get();

    if (!doc.exists) {
      return NextResponse.json({ valid: false, reason: 'not_found' });
    }

    const data = doc.data()!;
    if (data.usedAt !== null) {
      return NextResponse.json({ valid: false, reason: 'used' });
    }
    if (new Date(data.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ valid: false, reason: 'expired' });
    }

    return NextResponse.json({ valid: true, email: data.adminEmail });
  } catch (error) {
    console.error('reset-password GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Complete the reset
// Public token-gated endpoint; reset-token possession is the auth factor. // eslint-disable-line car-coating/require-auth
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const token = req.nextUrl.searchParams.get('token') || '';
  const tokenHash = token ? hashToken(token) : '';

  const { allowed } = await firestoreRateLimit({
    key: `reset-post:${ip}:${tokenHash}`,
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

  const parsed = resetPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { token: bodyToken, newPassword } = parsed.data;

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
  }

  try {
    if (!bodyToken) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const hash = hashToken(bodyToken);
    const db = getAdminDb();
    const tokenDoc = await db.collection('passwordResetTokens').doc(hash).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const tokenData = tokenDoc.data()!;
    if (tokenData.usedAt !== null) {
      return NextResponse.json({ error: 'Token already used' }, { status: 400 });
    }
    if (new Date(tokenData.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    const uid = tokenData.adminUid as string;
    const adminEmail = tokenData.adminEmail as string;

    // Update Firebase Auth password
    const adminAuth = getAdminAuth();
    await adminAuth.updateUser(uid, { password: newPassword });

    const now = new Date().toISOString();

    const batch = db.batch();
    // Mark token used
    batch.update(db.collection('passwordResetTokens').doc(hash), { usedAt: now });
    // Update user doc
    batch.update(db.collection('users').doc(uid), {
      passwordChangedAt: now,
      mustChangePassword: false,
      sessionInvalidAfter: now,
    });
    await batch.commit();

    // Send confirmation email (best-effort)
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      const displayName = userDoc.data()?.display_name || adminEmail;
      await sendPasswordChangedConfirmation({ adminEmail, adminName: displayName });
    } catch (emailErr) {
      console.error('Failed to send password-changed confirmation:', emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('reset-password POST failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
