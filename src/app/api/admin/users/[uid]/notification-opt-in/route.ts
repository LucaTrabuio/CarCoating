import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { notificationOptInSchema } from '@/lib/validations';

// PATCH: super_admin may toggle any user's notification opt-in.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ uid: string }> | { uid: string } },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { uid } = await Promise.resolve(ctx.params);

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
    await db.collection('users').doc(uid).update({
      notificationOptIn: parsed.data.optIn,
    });
    return NextResponse.json({ ok: true, optIn: parsed.data.optIn });
  } catch (error) {
    console.error(`[admin/users/${uid}/notification-opt-in] update failed:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
