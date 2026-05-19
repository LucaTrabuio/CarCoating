// Pure composers for the two daily-report email types.
// No I/O — all Firestore reads happen in the cron routes, then are passed in.

import { esc, escMultiline } from '@/lib/email';

// ─── Input types ───

export interface StoreInfo {
  storeId: string;
  storeName: string;
}

export interface ReservationRow {
  storeId: string;
  time: string;
  customerName: string;
  serviceType?: string;
  vehicleInfo?: string;
}

export interface InquiryRow {
  storeId: string;
  customerName: string;
  message?: string;
}

// ─── HTML scaffold helpers ───

function htmlWrapper(title: string, body: string): string {
  return `
    <div style="max-width:680px;margin:0 auto;font-family:sans-serif;color:#333">
      <div style="background:#0C3290;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:white;font-size:18px;margin:0">KeePer PRO SHOP</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:4px 0 0">${esc(title)}</p>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        ${body}
      </div>
    </div>
  `;
}

function storeHeader(storeName: string): string {
  return `<h2 style="margin:20px 0 8px;font-size:14px;color:#0C3290;border-bottom:1px solid #e0e0e0;padding-bottom:4px">${esc(storeName)}</h2>`;
}

// ─── Morning report ───

/**
 * Build the morning report email for a given JST date.
 * @param stores      Full list of stores (for name lookup).
 * @param reservations Reservations whose `reservationDate` === dateJstStr.
 * @param dateJstStr  YYYY-MM-DD string in JST.
 */
export function buildMorningReport(
  stores: StoreInfo[],
  reservations: ReservationRow[],
  dateJstStr: string,
): { subject: string; html: string } {
  const subject = `[本日のご予約] ${dateJstStr}`;

  const storeNameMap = new Map(stores.map((s) => [s.storeId, s.storeName]));

  const byStore = new Map<string, ReservationRow[]>();
  for (const r of reservations) {
    if (!byStore.has(r.storeId)) byStore.set(r.storeId, []);
    byStore.get(r.storeId)!.push(r);
  }

  let body: string;

  if (byStore.size === 0) {
    body = `<p style="font-size:14px;color:#555">本日のご予約はありません</p>`;
  } else {
    const sections: string[] = [];
    for (const [storeId, rows] of byStore) {
      const storeName = storeNameMap.get(storeId) ?? storeId;
      const rowsHtml = rows
        .map((r) => {
          return `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;white-space:nowrap">${esc(r.time)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px">${esc(r.customerName)} 様</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">${esc(r.serviceType ?? '')}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">${esc(r.vehicleInfo ?? '')}</td>
          </tr>`;
        })
        .join('');
      sections.push(
        storeHeader(storeName) +
          `<table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f8f8f8">
                <th style="padding:6px 8px;text-align:left;font-size:11px;color:#999;font-weight:600">時間</th>
                <th style="padding:6px 8px;text-align:left;font-size:11px;color:#999;font-weight:600">お名前</th>
                <th style="padding:6px 8px;text-align:left;font-size:11px;color:#999;font-weight:600">コース</th>
                <th style="padding:6px 8px;text-align:left;font-size:11px;color:#999;font-weight:600">車種</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>`,
      );
    }
    body = sections.join('');
  }

  return { subject, html: htmlWrapper(subject, body) };
}

// ─── Evening report ───

/**
 * Build the evening report email for a given JST date.
 * @param stores           Full list of stores (for name lookup).
 * @param newReservations  Reservations with createdAt within the JST day.
 * @param newInquiries     Inquiries with createdAt within the JST day.
 * @param dateJstStr       YYYY-MM-DD string in JST.
 */
export function buildEveningReport(
  stores: StoreInfo[],
  newReservations: ReservationRow[],
  newInquiries: InquiryRow[],
  dateJstStr: string,
): { subject: string; html: string } {
  const subject = `[本日の活動] ${dateJstStr}`;

  const storeNameMap = new Map(stores.map((s) => [s.storeId, s.storeName]));

  const reservationsByStore = new Map<string, ReservationRow[]>();
  for (const r of newReservations) {
    if (!reservationsByStore.has(r.storeId)) reservationsByStore.set(r.storeId, []);
    reservationsByStore.get(r.storeId)!.push(r);
  }

  const inquiriesByStore = new Map<string, InquiryRow[]>();
  for (const i of newInquiries) {
    if (!inquiriesByStore.has(i.storeId)) inquiriesByStore.set(i.storeId, []);
    inquiriesByStore.get(i.storeId)!.push(i);
  }

  const storeIds = new Set([
    ...reservationsByStore.keys(),
    ...inquiriesByStore.keys(),
  ]);

  let body: string;

  if (storeIds.size === 0) {
    body = `<p style="font-size:14px;color:#555">本日のアクティビティはありませんでした</p>`;
  } else {
    const sections: string[] = [];
    for (const storeId of storeIds) {
      const storeName = storeNameMap.get(storeId) ?? storeId;
      const resRows = reservationsByStore.get(storeId) ?? [];
      const inqRows = inquiriesByStore.get(storeId) ?? [];
      let storeBody = storeHeader(storeName);

      if (resRows.length > 0) {
        storeBody += `<div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">本日いただいた新規予約</div>
          <table style="width:100%;border-collapse:collapse">
            <tbody>
              ${resRows
                .map(
                  (r) => `<tr>
                <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;white-space:nowrap">${esc(r.time)}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px">${esc(r.customerName)} 様</td>
                <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">${esc(r.serviceType ?? '')}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">${esc(r.vehicleInfo ?? '')}</td>
              </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
      }

      if (inqRows.length > 0) {
        storeBody += `<div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">本日いただいたお問い合わせ</div>
          <table style="width:100%;border-collapse:collapse">
            <tbody>
              ${inqRows
                .map(
                  (i) => `<tr>
                <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;vertical-align:top">${esc(i.customerName)} 様</td>
                <td style="padding:5px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#666">${escMultiline(i.message ?? '')}</td>
              </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
      }

      sections.push(storeBody);
    }
    body = sections.join('');
  }

  return { subject, html: htmlWrapper(subject, body) };
}
