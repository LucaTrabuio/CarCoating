import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { notificationOptInSchema } from '@/lib/validations';

// PATCH: Any authenticated admin may toggle their own notification opt-in.
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = notificationOptInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    await db.collection('users').doc(auth.user.uid).update({
      notificationOptIn: parsed.data.optIn,
    });
    return NextResponse.json({ ok: true, optIn: parsed.data.optIn });
  } catch (error) {
    console.error('[admin/users/me/notification-opt-in] update failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
