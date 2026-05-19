import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendPasswordChangedConfirmation } from '@/lib/admin-security-emails';
import { passwordChangedHookSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    passwordChangedHookSchema.parse(body);

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
    console.error('password-changed failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
