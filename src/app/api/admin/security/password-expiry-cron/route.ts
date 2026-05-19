import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { daysUntilExpiry, PASSWORD_WARN_DAYS } from '@/lib/password-policy';
import { generateToken, hashToken } from '@/lib/tokens';
import { sendPasswordExpiryWarning } from '@/lib/admin-security-emails';
import { systemAlerts } from '@/lib/system-alerts-instance';

// Authorized by CRON_SECRET Bearer token instead of session auth. // eslint-disable-line car-coating/require-auth
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('users').get();

    const now = new Date().toISOString();
    const results: { uid: string; email: string; action: string }[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const uid = doc.id;
      const email: string = data.email || '';
      const displayName: string = data.display_name || email;
      const passwordChangedAt: string | undefined = data.passwordChangedAt;

      const days = daysUntilExpiry(passwordChangedAt);

      // Round to nearest integer day
      const roundedDays = Math.round(days);
      if (!PASSWORD_WARN_DAYS.includes(roundedDays)) continue;

      // Mint a fresh single-use token (invalidate prior unused tokens)
      const priorTokensSnap = await db
        .collection('passwordResetTokens')
        .where('adminUid', '==', uid)
        .where('usedAt', '==', null)
        .get();

      const batch = db.batch();
      priorTokensSnap.docs.forEach((d) => batch.update(d.ref, { usedAt: now }));

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

      try {
        await sendPasswordExpiryWarning({
          adminEmail: email,
          adminName: displayName,
          daysLeft: roundedDays,
          resetToken: token,
        });
        results.push({ uid, email, action: `warned-t${roundedDays}` });
      } catch (emailErr) {
        console.error(`[cron] Failed to send warning email to ${email}:`, emailErr);
        results.push({ uid, email, action: `warn-email-failed-t${roundedDays}` });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error('[cron] password-expiry-cron failed:', error);
    try {
      await systemAlerts.recordAlert({
        source: 'cron',
        severity: 'critical',
        title: 'Password expiry cron crashed',
        payload: { error: String(error) },
        dedupeKey: 'cron:password-expiry-cron',
      });
    } catch { /* never let alert recording corrupt the response */ }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
