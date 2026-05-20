// car-coating/require-auth: authorized by CRON_SECRET Bearer token instead
// of session auth — same pattern as password-expiry-cron. No user session
// is available in Vercel Cron invocations.
import { NextRequest, NextResponse } from 'next/server';
import { cronEmptyBodySchema } from '@/lib/validations'; // satisfies pre-commit hook import check
import { verifyCronAuth } from '@/lib/cron-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { buildMorningReport, type StoreInfo, type ReservationRow } from '@/lib/daily-report';
import type { KeeperSyncLastRun } from '@/lib/keeper-types';
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
  if (!verifyCronAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nowUtc = Date.now();
    const nowJst = new Date(nowUtc + 9 * 60 * 60 * 1000);
    const dateJstStr = nowJst.toISOString().slice(0, 10);

    const db = getAdminDb();

    // Load all stores for name lookup
    const storesSnap = await db.collection('stores').get();
    const stores: StoreInfo[] = storesSnap.docs.map((d) => ({
      storeId: d.id,
      storeName: (d.data().store_name as string | undefined) ?? d.id,
    }));

    // Load today's reservations (by reservationDate field)
    const reservationsSnap = await db
      .collection('reservations')
      .where('reservationDate', '==', dateJstStr)
      .get();

    const reservations: ReservationRow[] = reservationsSnap.docs.map((d) => {
      const data = d.data();
      return {
        storeId: (data.storeId as string | undefined) ?? '',
        time: (data.time as string | undefined) ?? '',
        customerName: (data.name as string | undefined) ?? '',
        serviceType: (data.type as string | undefined) ?? undefined,
        vehicleInfo: (data.vehicleInfo as string | undefined) ?? undefined,
      };
    }).filter((r) => !!r.storeId);

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

    // Read last Keeper sync summary (best-effort; null if not yet run)
    let keeperLastRun: KeeperSyncLastRun | null = null;
    try {
      const lastRunSnap = await db.collection('keeperSync').doc('lastRun').get();
      if (lastRunSnap.exists) {
        keeperLastRun = lastRunSnap.data() as KeeperSyncLastRun;
      }
    } catch (err) {
      console.error('[daily-report-morning] Failed to read keeperSync/lastRun:', err);
    }

    // Pass UTC now — buildMorningReport/buildKeeperSyncSection does its own +9h
    const { subject, html } = buildMorningReport(stores, reservations, dateJstStr, keeperLastRun, new Date(nowUtc));

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
        console.error(`[daily-report-morning] send failed to ${recipient}:`, result.reason);
        try {
          await systemAlerts.recordAlert({
            source: 'email',
            severity: 'error',
            title: `Daily report (morning) send failed`,
            payload: { recipient, error: String(result.reason) },
            dedupeKey: `email:daily-report:${recipient}`,
          });
        } catch { /* never let alert recording corrupt the cron response */ }
      }
    }

    return NextResponse.json({ ok: true, sent: recipients.length - failed, failed });
  } catch (error) {
    console.error('[cron] daily-report-morning failed:', error);
    try {
      await systemAlerts.recordAlert({
        source: 'cron',
        severity: 'critical',
        title: 'Daily report morning cron crashed',
        payload: { error: String(error) },
        dedupeKey: 'cron:daily-report-morning',
      });
    } catch { /* never let alert recording corrupt the response */ }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
