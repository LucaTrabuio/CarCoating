// SERVER ONLY — never import this file from a client component.
// It imports firebase-admin and must remain outside client bundles.

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { esc } from '@/lib/email';
import { createAlertsCore } from '@/modules/system-alerts';
import { createFirebaseAdminAdapter } from '@/modules/system-alerts/adapters/firebase-admin-adapter';
import type {
  AdminAuthAdapter,
  AdminIdentity,
  CriticalNotifier,
  RecipientsAdapter,
} from '@/modules/system-alerts';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verifies a Firebase ID token from an Authorization: Bearer <idToken> header.
// Only super_admins are granted access — the module routes forward the raw
// Authorization header straight to this adapter, which is functionally
// equivalent to requireAuth('super_admin').
export const adminAuthAdapter: AdminAuthAdapter = {
  async verifyAdmin(authHeader: string | null): Promise<AdminIdentity | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice('Bearer '.length);
    if (!token) return null;
    try {
      const firebaseAuth = getAdminAuth();
      const decoded = await firebaseAuth.verifyIdToken(token);
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (!userDoc.exists) return null;
      const data = userDoc.data()!;
      if (data.role !== 'super_admin') return null;
      return { uid: decoded.uid, email: decoded.email ?? '' };
    } catch {
      return null;
    }
  },
};

const criticalNotifier: CriticalNotifier = {
  async notifyCritical(alert, recipients): Promise<void> {
    if (!process.env.GMAIL_USER || recipients.length === 0) return;
    const payloadJson = JSON.stringify(alert.payload ?? {}, null, 2);
    const html = `
      <div style="max-width:600px;font-family:sans-serif;color:#333">
        <h2 style="color:#c62828">🚨 システムアラート: ${esc(alert.title)}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="padding:4px 0;color:#999;width:80px">重大度</td><td style="padding:4px 0;font-weight:bold">${esc(alert.severity.toUpperCase())}</td></tr>
          <tr><td style="padding:4px 0;color:#999">ソース</td><td style="padding:4px 0">${esc(alert.source)}</td></tr>
          <tr><td style="padding:4px 0;color:#999">発生回数</td><td style="padding:4px 0">${alert.occurrences}</td></tr>
          <tr><td style="padding:4px 0;color:#999">検出日時</td><td style="padding:4px 0">${esc(alert.createdAt)}</td></tr>
        </table>
        <pre style="margin:12px 0;padding:12px;background:#fafafa;border:1px solid #e0e0e0;border-radius:4px;font-size:12px;white-space:pre-wrap;word-break:break-word">${esc(payloadJson)}</pre>
        <p style="font-size:11px;color:#999">管理画面の「システムアラート」ページで確認・対応してください。</p>
      </div>
    `;
    await transporter.sendMail({
      from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
      to: recipients.join(', '),
      subject: `🚨 [${alert.severity.toUpperCase()}] ${alert.title}`.replace(/[\r\n]/g, ' '),
      html,
    });
  },
};

const recipientsAdapter: RecipientsAdapter = {
  async getCriticalRecipients(): Promise<string[]> {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection('users')
        .where('role', '==', 'super_admin')
        .where('notificationOptIn', '==', true)
        .get();
      return snap.docs
        .map((d) => (d.data().email as string | undefined) ?? '')
        .filter((e) => !!e);
    } catch {
      return [];
    }
  },
};

// Allows 'cron', 'inquiry', 'reservation', 'customer-sync', 'email' to use
// critical severity in addition to the module defaults.
const criticalSourceAllowlist = [
  'sync',
  'email',
  'auth',
  'cron',
  'inquiry',
  'reservation',
  'customer-sync',
  'keeper-sync',
];

// Singleton — imported by API routes and cron handlers; never by client code.
export const systemAlerts = createAlertsCore({
  storage: createFirebaseAdminAdapter({ adminDb: getAdminDb() }),
  notifier: criticalNotifier,
  recipients: recipientsAdapter,
  criticalSourceAllowlist,
});
