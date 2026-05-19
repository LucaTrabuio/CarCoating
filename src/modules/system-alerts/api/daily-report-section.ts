// Build the "🚨 システムアラート (past 24h)" HTML block for inclusion in any
// transactional digest email. Pure HTML string — no SDK, no I/O. Pass the
// alerts you already fetched (via `alerts.listAlerts({ since, excludeSources })`)
// and the absolute base URL for the admin link.
//
// Usage:
//   const alerts = await core.listAlerts({
//     since: windowStart,
//     excludeSources: ["test"],
//     limit: 200,
//   });
//   const html = buildSystemAlertsSection(alerts, { baseUrl, adminPath });
//   emailBody = emailBody + html;

import type { AlertSeverity, SystemAlert } from "../types";
import { resolveRunbookHint, type RunbookHintOverrides } from "../lib/runbook";

export interface BuildSystemAlertsSectionOptions {
  /** Absolute base URL of the admin app, e.g. https://admin.example.com */
  baseUrl: string;
  /** Path of the admin section that lists alerts. Default: "/admin?section=global-system-alerts". */
  adminPath?: string;
  /** Heading text. Default: "🚨 システムアラート (past 24h)". */
  heading?: string;
  /** Empty-state copy. Default: "アラートなし ✓". */
  emptyLabel?: string;
  /** Override or extend the runbook hint maps. */
  runbookOverrides?: RunbookHintOverrides;
  /** Max payload-preview length in chars before truncating. Default: 600. */
  payloadMaxChars?: number;
}

const SEV_LABELS: Record<AlertSeverity, string> = {
  critical: "重大",
  error: "エラー",
  warning: "警告",
  info: "情報",
};

const SEV_COLORS: Record<AlertSeverity, { bg: string; fg: string }> = {
  critical: { bg: "#fdecea", fg: "#c62828" },
  error: { bg: "#fff3e0", fg: "#e65100" },
  warning: { bg: "#fff8e1", fg: "#b26a00" },
  info: { bg: "#e3f2fd", fg: "#1565c0" },
};

const SEV_ORDER: AlertSeverity[] = ["critical", "error", "warning", "info"];

export function buildSystemAlertsSection(
  alerts: SystemAlert[],
  options: BuildSystemAlertsSectionOptions,
): string {
  const {
    baseUrl,
    adminPath = "/admin?section=global-system-alerts",
    heading = "🚨 システムアラート (past 24h)",
    emptyLabel = "アラートなし ✓",
    runbookOverrides,
    payloadMaxChars = 600,
  } = options;

  const adminUrl = `${baseUrl}${adminPath}`;

  if (alerts.length === 0) {
    return `
      <div style="margin-top: 28px; padding: 16px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px;">
        <h3 style="font-size: 13px; font-weight: bold; color: #333; margin: 0 0 10px; border-bottom: 2px solid #c62828; padding-bottom: 4px;">${escapeHtml(heading)}</h3>
        <p style="font-size: 13px; color: #2e7d32; margin: 0;">${escapeHtml(emptyLabel)}</p>
      </div>
    `;
  }

  const grouped: Record<AlertSeverity, SystemAlert[]> = {
    critical: [],
    error: [],
    warning: [],
    info: [],
  };
  for (const alert of alerts) {
    (grouped[alert.severity] ?? grouped.info).push(alert);
  }

  const renderCard = (sev: AlertSeverity, alert: SystemAlert): string => {
    const c = SEV_COLORS[sev];
    const runbook = resolveRunbookHint(alert, runbookOverrides);
    const payloadText = alert.payload ? JSON.stringify(alert.payload, null, 2) : "";
    const payloadPreview =
      payloadText.length > payloadMaxChars
        ? payloadText.slice(0, payloadMaxChars) + " …"
        : payloadText;
    const meta: string[] = [];
    meta.push(`初回 ${alert.createdAt.slice(0, 16).replace("T", " ")}`);
    if (alert.occurrences > 1) {
      meta.push(`最終 ${alert.updatedAt.slice(0, 16).replace("T", " ")} (×${alert.occurrences})`);
    }
    if (alert.notifiedAt) {
      meta.push(`通知 ${alert.notifiedAt.slice(0, 16).replace("T", " ")}`);
    }
    return `
      <div style="margin-top:10px;padding:10px 12px;background:white;border:1px solid #e8e8e8;border-radius:4px;">
        <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px;">
          <span style="display:inline-block;padding:1px 7px;border-radius:3px;background:${c.bg};color:${c.fg};font-size:11px;font-weight:bold;">${SEV_LABELS[sev]}</span>
          <span style="font-size:11px;color:#666;">${escapeHtml(alert.source)}</span>
          <span style="font-size:13px;font-weight:600;color:#222;">${escapeHtml(alert.title)}</span>
        </div>
        <div style="font-size:11px;color:#888;margin-bottom:6px;">${meta.map(escapeHtml).join(" · ")}</div>
        <div style="font-size:12px;color:#555;margin-bottom:6px;">${escapeHtml(runbook)}</div>
        ${payloadPreview ? `<pre style="margin:0;padding:8px 10px;background:#fafafa;border:1px solid #eee;border-radius:3px;font-size:11px;line-height:1.5;color:#333;white-space:pre-wrap;word-break:break-word;font-family:monospace;">${escapeHtml(payloadPreview)}</pre>` : ""}
      </div>
    `;
  };

  const cards = SEV_ORDER.filter((sev) => grouped[sev].length > 0)
    .map((sev) => grouped[sev].map((alert) => renderCard(sev, alert)).join(""))
    .join("");

  return `
    <div style="margin-top: 28px; padding: 16px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px;">
      <h3 style="font-size: 13px; font-weight: bold; color: #333; margin: 0 0 10px; border-bottom: 2px solid #c62828; padding-bottom: 4px;">${escapeHtml(heading)}</h3>
      ${cards}
      <p style="font-size:11px;color:#aaa;margin:12px 0 0;">
        <a href="${escapeHtml(adminUrl)}" style="color:#B0000F;">管理画面でアラートを確認する</a>
      </p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
