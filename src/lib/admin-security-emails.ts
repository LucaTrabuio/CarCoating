import nodemailer from 'nodemailer';
import { systemAlerts } from './system-alerts-instance';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
function esc(s: string | undefined | null): string {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendMailWithAlert(
  templateName: string,
  opts: Parameters<typeof transporter.sendMail>[0],
): Promise<void> {
  try {
    await transporter.sendMail(opts);
  } catch (err) {
    try {
      await systemAlerts.recordAlert({
        source: 'email',
        severity: 'error',
        title: `Admin security email send failed: ${templateName}`,
        payload: { template: templateName, to: String(opts.to), error: String(err) },
        dedupeKey: `email:${templateName}`,
      });
    } catch { /* never let alert recording corrupt the calling flow */ }
    throw err;
  }
}

function getResetBaseUrl(): string {
  return (
    process.env.ADMIN_RESET_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:8080'
  );
}

export async function sendPasswordExpiryWarning(opts: {
  adminEmail: string;
  adminName: string;
  daysLeft: number;
  resetToken: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const resetUrl = `${getResetBaseUrl()}/admin/reset-password?token=${encodeURIComponent(opts.resetToken)}`;

  const urgency =
    opts.daysLeft === 1
      ? { color: '#dc2626', label: '【緊急】', subject: '明日失効します' }
      : opts.daysLeft <= 4
        ? { color: '#ea580c', label: '【警告】', subject: `${opts.daysLeft}日後に失効します` }
        : { color: '#d97706', label: '【お知らせ】', subject: `${opts.daysLeft}日後に失効します` };

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP 管理画面</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.adminName)} 様</p>
        <div style="background:${urgency.color};color:white;padding:12px;text-align:center;font-weight:bold;border-radius:6px;margin:16px 0">
          パスワードが${opts.daysLeft === 1 ? '明日' : opts.daysLeft + '日後に'}失効します
        </div>
        <p style="font-size:13px">パスワードの有効期限が近づいています。引き続きご利用いただくために、以下のリンクからパスワードを変更してください。</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0C3290;color:white;border-radius:6px;font-weight:bold;text-decoration:none;font-size:14px">
            パスワードを変更する
          </a>
        </div>
        <p style="font-size:11px;color:#999">このリンクは48時間有効です。心当たりがない場合は無視してください。</p>
      </div>
    </div>
  `;

  await sendMailWithAlert('password-expiry-warning', {
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.adminEmail,
    subject: `${urgency.label}パスワードが${urgency.subject} — KeePer PRO SHOP 管理画面`,
    html,
  });
}

export async function sendPasswordChangedConfirmation(opts: {
  adminEmail: string;
  adminName: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP 管理画面</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.adminName)} 様</p>
        <div style="background:#4caf50;color:white;padding:12px;text-align:center;font-weight:bold;border-radius:6px;margin:16px 0">
          パスワードが正常に変更されました
        </div>
        <p style="font-size:13px">パスワードが変更されました。心当たりがない場合は、すぐに管理者にご連絡ください。</p>
      </div>
    </div>
  `;

  await sendMailWithAlert('password-changed-confirmation', {
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.adminEmail,
    subject: 'パスワード変更完了 — KeePer PRO SHOP 管理画面',
    html,
  });
}

export async function sendTempPasswordEmail(opts: {
  adminEmail: string;
  adminName: string;
  tempPassword: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const loginUrl = `${getResetBaseUrl()}/login`;

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP 管理画面</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.adminName)} 様</p>
        <p style="font-size:13px">管理画面アカウントが作成されました。以下の仮パスワードでログインし、すぐにパスワードを変更してください。</p>
        <div style="margin:20px 0;padding:16px;background:#f5f5f5;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#999;margin-bottom:8px">仮パスワード</div>
          <div style="font-size:20px;font-weight:bold;letter-spacing:2px;font-family:monospace">${esc(opts.tempPassword)}</div>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#0C3290;color:white;border-radius:6px;font-weight:bold;text-decoration:none;font-size:14px">
            ログインする
          </a>
        </div>
        <p style="font-size:11px;color:#999">セキュリティのため、ログイン後すぐにパスワードを変更してください。</p>
      </div>
    </div>
  `;

  await sendMailWithAlert('temp-password', {
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.adminEmail,
    subject: '管理画面アカウント作成のお知らせ — KeePer PRO SHOP',
    html,
  });
}

export async function sendForgotPasswordEmail(opts: {
  adminEmail: string;
  adminName: string;
  resetToken: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const resetUrl = `${getResetBaseUrl()}/admin/reset-password?token=${encodeURIComponent(opts.resetToken)}`;

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP 管理画面</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.adminName)} 様</p>
        <p style="font-size:13px">パスワードリセットのリクエストを受け付けました。以下のリンクからパスワードをリセットしてください。</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0C3290;color:white;border-radius:6px;font-weight:bold;text-decoration:none;font-size:14px">
            パスワードをリセットする
          </a>
        </div>
        <p style="font-size:11px;color:#999">このリンクは48時間有効で、一度だけ使用できます。心当たりがない場合は無視してください。</p>
      </div>
    </div>
  `;

  await sendMailWithAlert('forgot-password', {
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.adminEmail,
    subject: 'パスワードリセット — KeePer PRO SHOP 管理画面',
    html,
  });
}
