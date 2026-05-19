import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { resetUserPassword } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTempPasswordEmail } from '@/lib/admin-security-emails';
import { superAdminResetUserSchema } from '@/lib/validations';
import { firestoreRateLimit } from '@/lib/rate-limit-firestore';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { uid: targetUid } = await params;

  const ip = getClientIp(req);
  const { allowed } = await firestoreRateLimit({
    key: `admin-reset:${ip}`,
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

  const parsed = superAdminResetUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { deliveryMode } = parsed.data;

  try {
    const { tempPassword } = await resetUserPassword(targetUid, auth.user.uid);

    const db = getAdminDb();
    const targetDoc = await db.collection('users').doc(targetUid).get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const targetData = targetDoc.data()!;
    const targetEmail: string = targetData.email || '';
    const targetName: string = targetData.display_name || targetEmail;

    // Write log with correct delivery mode
    await db.collection('passwordResetLog').add({
      byUid: auth.user.uid,
      targetUid,
      at: new Date().toISOString(),
      method: deliveryMode,
    });

    if (deliveryMode === 'email') {
      try {
        await sendTempPasswordEmail({
          adminEmail: targetEmail,
          adminName: targetName,
          tempPassword,
        });
      } catch (emailErr) {
        console.error(`Failed to send temp password email to ${targetEmail}:`, emailErr);
      }
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ ok: true, tempPassword });
    }
  } catch (error) {
    console.error('admin reset-password failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
