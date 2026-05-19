import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validatePassword } from '@/lib/password-policy';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { sendPasswordChangedConfirmation } from '@/lib/admin-security-emails';
import { changePasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { newPassword } = parsed.data;

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    await adminAuth.updateUser(auth.user.uid, { password: newPassword });

    const now = new Date().toISOString();
    const db = getAdminDb();
    await db.collection('users').doc(auth.user.uid).update({
      passwordChangedAt: now,
      mustChangePassword: false,
      sessionInvalidAfter: now,
    });

    try {
      const userDoc = await db.collection('users').doc(auth.user.uid).get();
      const displayName = userDoc.data()?.display_name || auth.user.email;
      await sendPasswordChangedConfirmation({ adminEmail: auth.user.email, adminName: displayName });
    } catch (emailErr) {
      console.error('Failed to send password-changed confirmation:', emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('change-password failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
