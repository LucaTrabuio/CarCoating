import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { generateToken, hashToken } from '@/lib/tokens';
import { sendForgotPasswordEmail } from '@/lib/admin-security-emails';
import { forgotPasswordSchema } from '@/lib/validations';
import { firestoreRateLimit } from '@/lib/rate-limit-firestore';
import { getClientIp } from '@/lib/rate-limit';

// Public anti-enumeration endpoint; always returns 200 regardless of email match. // eslint-disable-line car-coating/require-auth
export async function POST(req: NextRequest) {
  // Always return 200 to prevent email enumeration
  const ip = getClientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const email = parsed.data.email.toLowerCase().trim();

  const { allowed } = await firestoreRateLimit({
    key: `forgot:${ip}:${email}`,
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!allowed) {
    // Still return 200 — but don't send email
    return NextResponse.json({ ok: true });
  }

  try {
    const db = getAdminDb();

    // Find admin by email
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ ok: true });
    }

    const userDoc = snap.docs[0];
    const uid = userDoc.id;
    const data = userDoc.data();
    const displayName: string = data.display_name || email;
    const now = new Date().toISOString();

    // Invalidate prior unused tokens
    const priorSnap = await db
      .collection('passwordResetTokens')
      .where('adminUid', '==', uid)
      .where('usedAt', '==', null)
      .get();

    const batch = db.batch();
    priorSnap.docs.forEach((d) => batch.update(d.ref, { usedAt: now }));

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    batch.set(db.collection('passwordResetTokens').doc(tokenHash), {
      adminUid: uid,
      adminEmail: email,
      createdAt: now,
      expiresAt,
      usedAt: null,
    });
    await batch.commit();

    await sendForgotPasswordEmail({
      adminEmail: email,
      adminName: displayName,
      resetToken: token,
    });
  } catch (error) {
    console.error('forgot-password failed:', error);
    // Still return 200 — do not leak details
  }

  return NextResponse.json({ ok: true });
}
