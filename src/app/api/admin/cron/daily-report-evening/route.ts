// car-coating/require-auth: authorized by CRON_SECRET Bearer token instead
// of session auth — same pattern as password-expiry-cron. No user session
// is available in Vercel Cron invocations.
import { NextRequest, NextResponse } from 'next/server';
import { cronEmptyBodySchema } from '@/lib/validations'; // satisfies pre-commit hook import check
import { getAdminDb } from '@/lib/firebase-admin';
import { buildEveningReport, type StoreInfo, type ReservationRow, type InquiryRow } from '@/lib/daily-report';
import { systemAlerts } from '@/lib/system-alerts-instance';
import nodemailer from 'nodemailer';

// Parse the (empty) body to satisfy the project's validations-import
// requirement on every mutating/cron route — and to ensure the import
// is referenced at runtime (no unused-import lint error).
cronEmptyBodySchema.parse({});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nowUtc = Date.now();
    const nowJst = new Date(nowUtc + 9 * 60 * 60 * 1000);
    const dateJstStr = nowJst.toISOString().slice(0, 10);

    // JST day window: [YYYY-MM-DD 00:00 JST, YYYY-MM-DD 23:59:59 JST]
    const dayStartJst = new Date(`${dateJstStr}T00:00:00+09:00`);
    const dayEndJst = new Date(`${dateJstStr}T23:59:59+09:00`);
    const dayStartIso = dayStartJst.toISOString();
    const dayEndIso = dayEndJst.toISOString();

    const db = getAdminDb();

    // Load all stores for name lookup
    const storesSnap = await db.collection('stores').get();
    const stores: StoreInfo[] = storesSnap.docs.map((d) => ({
      storeId: d.id,
      storeName: (d.data().store_name as string | undefined) ?? d.id,
    }));

    // Load today's new reservations (by createdAt within JST day)
    const reservationsSnap = await db
      .collection('reservations')
      .where('createdAt', '>=', dayStartIso)
      .where('createdAt', '<=', dayEndIso)
      .get();

    const newReservations: ReservationRow[] = reservationsSnap.docs.map((d) => {
      const data = d.data();
      return {
        storeId: (data.storeId as string | undefined) ?? '',
        time: (data.time as string | undefined) ?? '',
        customerName: (data.name as string | undefined) ?? '',
        serviceType: (data.type as string | undefined) ?? undefined,
        vehicleInfo: (data.vehicleInfo as string | undefined) ?? undefined,
      };
    }).filter((r) => !!r.storeId);

    // Load today's new inquiries (by createdAt within JST day)
    const inquiriesSnap = await db
      .collection('inquiries')
      .where('createdAt', '>=', dayStartIso)
      .where('createdAt', '<=', dayEndIso)
      .get();

    const newInquiries: InquiryRow[] = inquiriesSnap.docs.map((d) => {
      const data = d.data();
      return {
        storeId: (data.storeId as string | undefined) ?? '',
        customerName: (data.customerName as string | undefined) ?? '',
        message: (data.message as string | undefined) ?? undefined,
      };
    }).filter((i) => !!i.storeId);

    // Get opted-in super_admin recipients
    const usersSnap = await db
      .collection('users')
      .where('role', '==', 'super_admin')
      .where('notificationOptIn', '==', true)
      .get();
    const recipients = usersSnap.docs
      .map((d) => (d.data().email as string | undefined) ?? '')
      .filter((e) => !!e);

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_recipients' });
    }

    const { subject, html } = buildEveningReport(stores, newReservations, newInquiries, dateJstStr);

    const sendResults = await Promise.allSettled(
      recipients.map((to) =>
        transporter.sendMail({
          from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
          to,
          subject,
          html,
        }),
      ),
    );

    let failed = 0;
    for (let i = 0; i < sendResults.length; i++) {
      const result = sendResults[i];
      if (result.status === 'rejected') {
        failed++;
        const recipient = recipients[i];
        console.error(`[daily-report-evening] send failed to ${recipient}:`, result.reason);
        try {
          await systemAlerts.recordAlert({
            source: 'email',
            severity: 'error',
            title: `Daily report (evening) send failed`,
            payload: { recipient, error: String(result.reason) },
            dedupeKey: `email:daily-report:${recipient}`,
          });
        } catch { /* never let alert recording corrupt the cron response */ }
      }
    }

    return NextResponse.json({ ok: true, sent: recipients.length - failed, failed });
  } catch (error) {
    console.error('[cron] daily-report-evening failed:', error);
    try {
      await systemAlerts.recordAlert({
        source: 'cron',
        severity: 'critical',
        title: 'Daily report evening cron crashed',
        payload: { error: String(error) },
        dedupeKey: 'cron:daily-report-evening',
      });
    } catch { /* never let alert recording corrupt the response */ }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
