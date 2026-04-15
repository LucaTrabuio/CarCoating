import nodemailer from 'nodemailer';
import type { ReservationChoice } from './reservation-types';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

import { SITE_URL as siteUrl } from './constants';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape user-supplied text before interpolating into HTML email bodies. */
function esc(s: string | undefined | null): string {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

/** Escape text and convert newlines to <br> for multi-line display. */
function escMultiline(s: string | undefined | null): string {
  return esc(s).replace(/\n/g, '<br>');
}

function formatChoiceDate(date: string, time: string): string {
  const d = new Date(date + 'T00:00:00+09:00');
  const dayLabel = DAY_LABELS[d.getDay()];
  return `${date}（${dayLabel}）${time}`;
}

function buildChoicesHtml(choices: ReservationChoice[], confirmedIndex?: number): string {
  return choices.map((c, i) => {
    const label = `第${i + 1}希望: ${formatChoiceDate(c.date, c.time)}`;
    if (confirmedIndex === i) {
      return `<div style="padding:8px 12px;margin:4px 0;background:#e8f5e9;border:2px solid #4caf50;border-radius:6px;font-weight:bold;color:#2e7d32">✓ ${label}（確定）</div>`;
    }
    return `<div style="padding:8px 12px;margin:4px 0;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;color:#666">${label}</div>`;
  }).join('');
}

function escIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function generateICS(date: string, time: string, summary: string, location: string): string {
  const [h, m] = time.split(':').map(Number);
  const start = date.replace(/-/g, '') + 'T' + String(h).padStart(2, '0') + String(m).padStart(2, '0') + '00';
  const endMin = h * 60 + m + 30;
  const end = date.replace(/-/g, '') + 'T' + String(Math.floor(endMin / 60)).padStart(2, '0') + String(endMin % 60).padStart(2, '0') + '00';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KeePer PRO SHOP//Reservation//JA',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Asia/Tokyo:${start}`,
    `DTEND;TZID=Asia/Tokyo:${end}`,
    `SUMMARY:${escIcs(summary)}`,
    `LOCATION:${escIcs(location)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:予約30分前',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export async function sendConfirmationEmail(opts: {
  customerEmail: string;
  customerName: string;
  choices?: ReservationChoice[];
  date: string;
  time: string;
  locationName: string;
  locationPhone: string;
  locationAddress: string;
  type: string;
  reservationId: string;
  cancelToken?: string;
  isConfirmed?: boolean;
  adminMessage?: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const statusBanner = opts.isConfirmed
    ? '<div style="background:#4caf50;color:white;padding:12px;text-align:center;font-weight:bold;border-radius:6px;margin-bottom:16px">ご予約が確定しました</div>'
    : '<div style="background:#ff9800;color:white;padding:12px;text-align:center;font-weight:bold;border-radius:6px;margin-bottom:16px">ご予約を受け付けました（確認待ち）</div>';

  const choicesHtml = opts.choices
    ? buildChoicesHtml(opts.choices, opts.isConfirmed ? opts.choices.findIndex(c => c.date === opts.date && c.time === opts.time) : undefined)
    : `<div style="padding:8px 12px;background:#f5f5f5;border-radius:6px">${formatChoiceDate(opts.date, opts.time)}</div>`;

  const adminMessageHtml = opts.adminMessage
    ? `<div style="margin:16px 0;padding:12px;background:#e3f2fd;border-radius:6px"><strong>店舗からのメッセージ:</strong><br>${escMultiline(opts.adminMessage)}</div>`
    : '';

  const cancelUrl = `${siteUrl}/cancel/${encodeURIComponent(opts.reservationId)}${opts.cancelToken ? `?token=${encodeURIComponent(opts.cancelToken)}` : ''}`;

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0 0">${esc(opts.locationName)}</p>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.customerName)} 様</p>
        ${statusBanner}
        <h3 style="margin:16px 0 8px;font-size:14px">ご希望日時</h3>
        ${choicesHtml}
        ${adminMessageHtml}
        <div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:8px;font-size:13px">
          <strong>${esc(opts.locationName)}</strong><br>
          ${esc(opts.locationAddress)}<br>
          TEL: ${esc(opts.locationPhone)}
        </div>
        <div style="text-align:center;margin:24px 0 16px">
          <a href="${cancelUrl}" style="display:inline-block;padding:10px 20px;background:#f5f5f5;color:#666;border:1px solid #ddd;border-radius:6px;font-size:12px;text-decoration:none">
            予約をキャンセル
          </a>
        </div>
        <p style="font-size:11px;color:#999;margin-top:20px;text-align:center">
          キャンセルや変更のご相談はお電話でも承ります。
        </p>
      </div>
    </div>
  `;

  const attachments = opts.isConfirmed ? [{
    filename: 'reservation.ics',
    content: generateICS(opts.date, opts.time, `KeePer PRO SHOP ${opts.locationName}`, opts.locationAddress),
    contentType: 'text/calendar',
  }] : [];

  await transporter.sendMail({
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.customerEmail,
    subject: opts.isConfirmed ? `【確定】ご予約確認 - ${opts.locationName}` : `ご予約受付 - ${opts.locationName}`.replace(/[\r\n]/g, ' '),
    html,
    attachments,
  });
}

export async function sendStaffNotificationEmail(opts: {
  staffEmail: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  choices: ReservationChoice[];
  date: string;
  time: string;
  locationName: string;
  type: string;
  notes: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER || opts.staffEmail.length === 0) return;

  const html = `
    <div style="max-width:600px;font-family:sans-serif;color:#333">
      <h2 style="color:#0C3290">新規予約 - ${esc(opts.locationName)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#999;width:100px">お名前</td><td style="padding:6px 0;font-weight:bold">${esc(opts.customerName)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">電話</td><td style="padding:6px 0">${esc(opts.customerPhone)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">メール</td><td style="padding:6px 0">${esc(opts.customerEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">種別</td><td style="padding:6px 0">${opts.type === 'visit' ? '来店予約' : 'お問い合わせ'}</td></tr>
      </table>
      <h3 style="margin:16px 0 8px">予約日時</h3>
      <div style="padding:12px;background:#e8f5e9;border:2px solid #4caf50;border-radius:6px;font-weight:bold;color:#2e7d32">
        ${formatChoiceDate(opts.date, opts.time)}
      </div>
      ${opts.notes ? `<div style="margin:12px 0;padding:12px;background:#fff3e0;border-radius:6px"><strong>備考:</strong><br>${escMultiline(opts.notes)}</div>` : ''}
    </div>
  `;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP 予約通知" <${process.env.GMAIL_USER}>`,
    to: opts.staffEmail.join(', '),
    subject: `【新規予約】${opts.customerName} 様 - ${opts.locationName}`,
    html,
  });
}

export async function sendCancellationConfirmationEmail(opts: {
  customerEmail: string;
  customerName: string;
  date: string;
  time: string;
  locationName: string;
  locationPhone: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const html = `
    <div style="max-width:600px;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP</h1>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.customerName)} 様</p>
        <div style="background:#ffebee;color:#c62828;padding:12px;text-align:center;font-weight:bold;border-radius:6px;margin:16px 0">ご予約をキャンセルしました</div>
        <p style="font-size:13px">日時: ${formatChoiceDate(opts.date, opts.time)}</p>
        <p style="font-size:13px">再予約をご希望の場合はお電話にてご連絡ください。</p>
        <p style="font-size:13px">TEL: ${esc(opts.locationPhone)}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.customerEmail,
    subject: `キャンセル確認 - ${opts.locationName}`,
    html,
  });
}

export async function sendCancellationNotificationEmail(opts: {
  staffEmail: string[];
  customerName: string;
  date: string;
  time: string;
  locationName: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER || opts.staffEmail.length === 0) return;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP 予約通知" <${process.env.GMAIL_USER}>`,
    to: opts.staffEmail.join(', '),
    subject: `【キャンセル】${opts.customerName} 様 - ${opts.locationName}`,
    html: `<p><strong>${esc(opts.customerName)}</strong> 様の予約がキャンセルされました。</p><p>日時: ${formatChoiceDate(opts.date, opts.time)}</p>`,
  });
}

export async function sendInquiryConfirmationEmail(opts: {
  customerEmail: string;
  customerName: string;
  locationName: string;
  locationPhone: string;
  locationAddress: string;
  message: string;
  tierName?: string;
  tierPrice?: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const pricingHtml = opts.tierName && opts.tierPrice
    ? `<div style="margin:16px 0;padding:16px;background:#e8f5e9;border:2px solid #4caf50;border-radius:6px">
        <div style="font-size:13px;color:#666;margin-bottom:4px">ご検討中のコース</div>
        <div style="font-weight:bold;font-size:16px;color:#2e7d32">${esc(opts.tierName)}</div>
        <div style="font-size:20px;font-weight:bold;color:#2e7d32;margin-top:4px">${esc(opts.tierPrice)}</div>
        <div style="font-size:11px;color:#999;margin-top:4px">※ 上記はWeb予約割引適用価格（税込）です。車サイズにより変動します。</div>
      </div>`
    : '';

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0f1c2e;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0 0">${esc(opts.locationName)}</p>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.customerName)} 様</p>
        <div style="background:#2196f3;color:white;padding:12px;text-align:center;font-weight:bold;border-radius:6px;margin-bottom:16px">
          お問い合わせを受け付けました
        </div>
        <p style="font-size:13px;color:#666">店舗担当者より追ってご連絡いたします。</p>
        ${pricingHtml}
        ${opts.message ? `<div style="margin:16px 0;padding:12px;background:#f5f5f5;border-radius:6px"><strong>お問い合わせ内容:</strong><br><span style="font-size:13px">${escMultiline(opts.message)}</span></div>` : ''}
        <div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:8px;font-size:13px">
          <strong>${esc(opts.locationName)}</strong><br>
          ${esc(opts.locationAddress)}<br>
          TEL: ${esc(opts.locationPhone)}
        </div>
        <p style="font-size:11px;color:#999;margin-top:20px;text-align:center">
          お急ぎの場合はお電話でも承ります。
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.customerEmail,
    subject: `お問い合わせ受付 - ${opts.locationName}`,
    html,
  });
}

export async function sendInquiryNotificationEmail(opts: {
  staffEmail: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  locationName: string;
  message: string;
  tierName?: string;
  vehicleInfo?: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER || opts.staffEmail.length === 0) return;

  const html = `
    <div style="max-width:600px;font-family:sans-serif;color:#333">
      <h2 style="color:#0f1c2e">新規お問い合わせ - ${esc(opts.locationName)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#999;width:100px">お名前</td><td style="padding:6px 0;font-weight:bold">${esc(opts.customerName)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">電話</td><td style="padding:6px 0">${esc(opts.customerPhone)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">メール</td><td style="padding:6px 0">${esc(opts.customerEmail)}</td></tr>
        ${opts.vehicleInfo ? `<tr><td style="padding:6px 0;color:#999">車種</td><td style="padding:6px 0">${esc(opts.vehicleInfo)}</td></tr>` : ''}
        ${opts.tierName ? `<tr><td style="padding:6px 0;color:#999">検討コース</td><td style="padding:6px 0;font-weight:bold;color:#2e7d32">${esc(opts.tierName)}</td></tr>` : ''}
      </table>
      <div style="margin:12px 0;padding:12px;background:#e3f2fd;border-radius:6px">
        <strong>お問い合わせ内容:</strong><br>
        ${escMultiline(opts.message)}
      </div>
      <p style="font-size:11px;color:#999">このメールに返信すると、お客様（${esc(opts.customerEmail)}）に直接返信されます。</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP お問い合わせ" <${process.env.GMAIL_USER}>`,
    replyTo: opts.customerEmail,
    to: opts.staffEmail.join(', '),
    subject: `【お問い合わせ】${opts.customerName} 様 - ${opts.locationName}`,
    html,
  });
}

export async function sendTicketNotificationEmail(opts: {
  adminEmails: string[];
  authorEmail: string;
  key: string;
  subject: string;
  type: string;
  severity: string;
  message: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER || opts.adminEmails.length === 0) return;

  const typeLabels: Record<string, string> = { bug: 'バグ', improvement: '改善', support: 'サポート', general: '一般' };
  const severityLabels: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  const severityColors: Record<string, string> = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#6b7280' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8081';
  const severityColor = severityColors[opts.severity] || '#d97706';
  const typeLabel = typeLabels[opts.type] || opts.type;
  const severityLabel = severityLabels[opts.severity] || opts.severity;
  const html = `
    <div style="max-width:600px;font-family:sans-serif;color:#333">
      <h2 style="color:#0C3290">新規チケット <span style="font-family:monospace;font-size:14px;color:#0C3290">${esc(opts.key)}</span></h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#999;width:80px">件名</td><td style="padding:6px 0;font-weight:bold">${esc(opts.subject)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">送信者</td><td style="padding:6px 0">${esc(opts.authorEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#999">種別</td><td style="padding:6px 0"><span style="background:#e5e7eb;padding:2px 8px;border-radius:4px;font-size:12px">${esc(typeLabel)}</span></td></tr>
        <tr><td style="padding:6px 0;color:#999">重要度</td><td style="padding:6px 0"><span style="background:${severityColor};color:white;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold">${esc(severityLabel)}</span></td></tr>
      </table>
      <div style="margin:16px 0;padding:16px;background:#fff3e0;border-radius:6px">
        <div style="font-size:11px;color:#999;margin-bottom:6px">メッセージ:</div>
        <div style="font-size:14px">${escMultiline(opts.message)}</div>
      </div>
      <p><a href="${siteUrl}/admin/tickets" style="display:inline-block;padding:10px 20px;background:#0C3290;color:white;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px">チケットを確認する →</a></p>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP チケット" <${process.env.GMAIL_USER}>`,
    to: opts.adminEmails.join(', '),
    subject: `【${opts.key}】${typeLabel} / ${severityLabel} — ${opts.subject}`.replace(/[\r\n]/g, ' '),
    html,
  });
}

export async function sendInquiryReplyEmail(opts: {
  customerEmail: string;
  customerName: string;
  locationName: string;
  replyText: string;
  originalMessage: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER) return;

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0 0">${esc(opts.locationName)}</p>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <p>${esc(opts.customerName)} 様</p>
        <p style="font-size:13px;color:#666">お問い合わせいただきありがとうございます。</p>
        <div style="margin:16px 0;padding:16px;background:#e8f5e9;border:2px solid #4caf50;border-radius:6px">
          <div style="font-size:12px;color:#666;margin-bottom:8px">店舗からの回答:</div>
          <div style="font-size:14px;color:#333;white-space:pre-wrap">${escMultiline(opts.replyText)}</div>
        </div>
        <div style="margin:16px 0;padding:12px;background:#f5f5f5;border-radius:6px;font-size:12px;color:#999">
          <div style="margin-bottom:4px">お客様のお問い合わせ内容:</div>
          ${escMultiline(opts.originalMessage)}
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeePer PRO SHOP" <${process.env.GMAIL_USER}>`,
    to: opts.customerEmail,
    subject: `お問い合わせへのご回答 - ${opts.locationName}`,
    html,
  });
}
