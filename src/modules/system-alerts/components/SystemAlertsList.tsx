"use client";

// Admin list UI for system alerts. Self-contained — no project-specific CSS
// vars and no hardcoded API path. Wire it with:
//
//   <SystemAlertsList
//     getIdToken={async () => (await getAuth().currentUser?.getIdToken()) ?? null}
//     apiBasePath="/api/admin/system-alerts"
//   />
//
// All Tailwind/CSS-var lookups have inline fallbacks so the component
// renders correctly even before the consumer adds custom theming.

import { useEffect, useState } from "react";
import type { SystemAlert, AlertSeverity, AlertStatus } from "../types";
import {
  resolveRunbookHint,
  type RunbookHintOverrides,
} from "../lib/runbook";

export interface SystemAlertsListProps {
  getIdToken: () => Promise<string | null>;
  /** Mount point of the routes — must match where you wired the handlers.
   *  Default: "/api/admin/system-alerts". */
  apiBasePath?: string;
  /** Override or extend runbook hints (also used by the daily-report email,
   *  pass the same overrides to both for consistency). */
  runbookOverrides?: RunbookHintOverrides;
  /** Source-name override for the test-data toggle. Default: "test". */
  testSourceName?: string;
  /** Source → link mapping shown in the expand panel. Receives the alert and
   *  returns { href, label } or null. Defaults below cover sync/email/auth. */
  buildSourceLink?: (alert: SystemAlert) => { href: string; label: string } | null;
}

const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "重大",
  error: "エラー",
  warning: "警告",
  info: "情報",
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  open: "未対応",
  acknowledged: "確認済み",
  resolved: "解決済み",
};

const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; fg: string }> = {
  critical: { bg: "#fdecea", fg: "#c62828" },
  error: { bg: "#fff3e0", fg: "#e65100" },
  warning: { bg: "#fff8e1", fg: "#b26a00" },
  info: { bg: "#e3f2fd", fg: "#1565c0" },
};

const STATUS_COLORS: Record<AlertStatus, { bg: string; fg: string }> = {
  open: { bg: "#fff8e1", fg: "#f57f17" },
  acknowledged: { bg: "#e3f2fd", fg: "#1565c0" },
  resolved: { bg: "#e8f5e9", fg: "#2e7d32" },
};

const ALL_SEVERITIES: AlertSeverity[] = ["critical", "error", "warning", "info"];
const ALL_STATUSES: AlertStatus[] = ["open", "acknowledged", "resolved"];

// var(--name) calls fall back to literal values so the component renders
// without project Tailwind configuration.
const C_GRAY = "var(--gray, #888)";
const C_TEXT = "var(--text, #222)";
const C_BORDER = "var(--border, #e0e0e0)";

function defaultBuildSourceLink(alert: SystemAlert) {
  const slug = typeof alert.payload?.slug === "string" ? (alert.payload.slug as string) : null;
  const to = typeof alert.payload?.to === "string" ? (alert.payload.to as string) : null;
  if (alert.source === "sync" && slug) {
    return { href: `/admin/${slug}`, label: `対象 (${slug}) を開く` };
  }
  if (alert.source === "email" && to) {
    return { href: `mailto:${to}`, label: `${to} へメール` };
  }
  if (alert.source === "auth") {
    return { href: "/admin/settings/security", label: "セキュリティ設定を開く" };
  }
  return null;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "—";
  return value.slice(0, 19).replace("T", " ");
}

export default function SystemAlertsList({
  getIdToken,
  apiBasePath = "/api/admin/system-alerts",
  runbookOverrides,
  testSourceName = "test",
  buildSourceLink = defaultBuildSourceLink,
}: SystemAlertsListProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeverities, setActiveSeverities] = useState<Set<AlertSeverity>>(
    new Set(["critical", "error"]),
  );
  const [activeStatuses, setActiveStatuses] = useState<Set<AlertStatus>>(new Set(["open"]));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showTestData, setShowTestData] = useState(false);
  const [purging, setPurging] = useState(false);

  const fetchAlerts = async (
    severities: Set<AlertSeverity>,
    statuses: Set<AlertStatus>,
    includeTest: boolean,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (severities.size > 0) params.set("severity", [...severities].join(","));
      if (statuses.size > 0) params.set("status", [...statuses].join(","));
      if (!includeTest) params.set("excludeSources", testSourceName);
      params.set("limit", "100");
      const res = await fetch(`${apiBasePath}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setError("システムアラートの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(activeSeverities, activeStatuses, showTestData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSeverity = (sev: AlertSeverity) => {
    const next = new Set(activeSeverities);
    if (next.has(sev)) next.delete(sev);
    else next.add(sev);
    setActiveSeverities(next);
    fetchAlerts(next, activeStatuses, showTestData);
  };

  const toggleStatus = (st: AlertStatus) => {
    const next = new Set(activeStatuses);
    if (next.has(st)) next.delete(st);
    else next.add(st);
    setActiveStatuses(next);
    fetchAlerts(activeSeverities, next, showTestData);
  };

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const handleAction = async (alertId: string, action: "acknowledge" | "resolve") => {
    setActionLoading(alertId + ":" + action);
    try {
      const token = await getIdToken();
      const res = await fetch(`${apiBasePath}/${alertId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("action failed");
      await fetchAlerts(activeSeverities, activeStatuses, showTestData);
    } catch {
      setError("操作に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTestData = async () => {
    const next = !showTestData;
    setShowTestData(next);
    await fetchAlerts(activeSeverities, activeStatuses, next);
  };

  const handlePurgeTest = async () => {
    if (!window.confirm("テストデータをすべて削除しますか？")) return;
    setPurging(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${apiBasePath}/purge-test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("purge failed");
      await fetchAlerts(activeSeverities, activeStatuses, showTestData);
    } catch {
      setError("テストデータの削除に失敗しました");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: C_GRAY, alignSelf: "center" }}>重大度:</span>
        {ALL_SEVERITIES.map((sev) => {
          const active = activeSeverities.has(sev);
          const c = SEVERITY_COLORS[sev];
          return (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${active ? c.fg : C_BORDER}`,
                background: active ? c.bg : "white",
                color: active ? c.fg : C_GRAY,
                cursor: "pointer",
              }}
            >
              {SEVERITY_LABELS[sev]}
            </button>
          );
        })}
        <span style={{ fontSize: 12, color: C_GRAY, alignSelf: "center", marginLeft: 8 }}>
          状態:
        </span>
        {ALL_STATUSES.map((st) => {
          const active = activeStatuses.has(st);
          const c = STATUS_COLORS[st];
          return (
            <button
              key={st}
              onClick={() => toggleStatus(st)}
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${active ? c.fg : C_BORDER}`,
                background: active ? c.bg : "white",
                color: active ? c.fg : C_GRAY,
                cursor: "pointer",
              }}
            >
              {STATUS_LABELS[st]}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleToggleTestData}
          data-testid="alerts-toggle-test-data"
          style={{
            padding: "3px 10px",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 500,
            border: `1px dashed ${C_BORDER}`,
            background: showTestData ? "#f5f5f5" : "white",
            color: C_GRAY,
            cursor: "pointer",
          }}
        >
          {showTestData ? "テストデータを非表示" : "テストデータを表示"}
        </button>
        {showTestData && (
          <button
            type="button"
            onClick={handlePurgeTest}
            disabled={purging}
            data-testid="alerts-purge-test"
            style={{
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid #c62828",
              background: "white",
              color: "#c62828",
              cursor: purging ? "wait" : "pointer",
            }}
          >
            {purging ? "削除中..." : "テストデータを一括削除"}
          </button>
        )}
      </div>

      {loading && <p style={{ fontSize: 13, color: C_GRAY }}>読み込み中...</p>}
      {error && (
        <p
          role="alert"
          style={{
            fontSize: 13,
            color: "#991b1b",
            background: "#fee2e2",
            padding: "8px 12px",
            borderRadius: 4,
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && alerts.length === 0 && (
        <p style={{ fontSize: 13, color: C_GRAY }}>アラートはありません</p>
      )}

      {!loading && alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((alert) => {
            const sevC = SEVERITY_COLORS[alert.severity];
            const stC = STATUS_COLORS[alert.status];
            const isActingAck = actionLoading === alert.id + ":acknowledge";
            const isActingRes = actionLoading === alert.id + ":resolve";
            const expanded = expandedIds.has(alert.id);
            const sourceLink = buildSourceLink(alert);
            const runbook = resolveRunbookHint(alert, runbookOverrides);
            const payloadJson = alert.payload
              ? JSON.stringify(alert.payload, null, 2)
              : "(なし)";
            return (
              <div
                key={alert.id}
                data-testid={`alert-row-${alert.id}`}
                style={{
                  background: "white",
                  border: `1px solid ${C_BORDER}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(alert.id)}
                    aria-label={expanded ? "詳細を閉じる" : "詳細を開く"}
                    aria-expanded={expanded}
                    data-testid={`alert-toggle-${alert.id}`}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      color: C_GRAY,
                      padding: "0 2px",
                      lineHeight: 1,
                    }}
                  >
                    {expanded ? "▾" : "▸"}
                  </button>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      background: sevC.bg,
                      color: sevC.fg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {SEVERITY_LABELS[alert.severity]}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 11,
                      background: "#f5f5f5",
                      color: "#666",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {alert.source}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      color: C_TEXT,
                      minWidth: 120,
                    }}
                  >
                    {alert.title}
                    {alert.occurrences > 1 && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          color: C_GRAY,
                          fontWeight: 400,
                        }}
                      >
                        ×{alert.occurrences}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: C_GRAY, whiteSpace: "nowrap" }}>
                    {alert.createdAt.slice(0, 10)}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 600,
                      background: stC.bg,
                      color: stC.fg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {STATUS_LABELS[alert.status]}
                  </span>
                  {alert.status !== "acknowledged" && alert.status !== "resolved" && (
                    <button
                      onClick={() => handleAction(alert.id, "acknowledge")}
                      disabled={isActingAck}
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        background: "white",
                        border: `1px solid ${C_BORDER}`,
                        borderRadius: 4,
                        cursor: isActingAck ? "wait" : "pointer",
                      }}
                    >
                      {isActingAck ? "..." : "承認"}
                    </button>
                  )}
                  {alert.status !== "resolved" && (
                    <button
                      onClick={() => handleAction(alert.id, "resolve")}
                      disabled={isActingRes}
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        background: "white",
                        border: `1px solid ${C_BORDER}`,
                        borderRadius: 4,
                        cursor: isActingRes ? "wait" : "pointer",
                      }}
                    >
                      {isActingRes ? "..." : "解決"}
                    </button>
                  )}
                </div>

                {expanded && (
                  <div
                    data-testid={`alert-detail-${alert.id}`}
                    style={{
                      padding: "12px 16px 16px 36px",
                      background: "#fafafa",
                      borderTop: `1px solid ${C_BORDER}`,
                      display: "grid",
                      gap: 12,
                      fontSize: 12,
                      color: "#333",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#555", marginBottom: 4 }}>
                        対応のヒント
                      </div>
                      <div>{runbook}</div>
                      {sourceLink && (
                        <div style={{ marginTop: 6 }}>
                          <a
                            href={sourceLink.href}
                            style={{ color: "#B0000F", fontSize: 12 }}
                          >
                            {sourceLink.label} →
                          </a>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "max-content 1fr",
                        columnGap: 12,
                        rowGap: 4,
                      }}
                    >
                      <div style={{ color: "#777" }}>初回検出</div>
                      <div>{formatTimestamp(alert.createdAt)}</div>
                      <div style={{ color: "#777" }}>最終更新</div>
                      <div>
                        {formatTimestamp(alert.updatedAt)}
                        {alert.occurrences > 1 && (
                          <span style={{ color: "#777", marginLeft: 8 }}>
                            (発生 {alert.occurrences} 回)
                          </span>
                        )}
                      </div>
                      {alert.notifiedAt && (
                        <>
                          <div style={{ color: "#777" }}>通知送信</div>
                          <div>{formatTimestamp(alert.notifiedAt)}</div>
                        </>
                      )}
                      {alert.acknowledgedAt && (
                        <>
                          <div style={{ color: "#777" }}>承認</div>
                          <div>
                            {formatTimestamp(alert.acknowledgedAt)}
                            {alert.acknowledgedBy && (
                              <span style={{ color: "#777", marginLeft: 8 }}>
                                by {alert.acknowledgedBy}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {alert.resolvedAt && (
                        <>
                          <div style={{ color: "#777" }}>解決</div>
                          <div>
                            {formatTimestamp(alert.resolvedAt)}
                            {alert.resolvedBy && (
                              <span style={{ color: "#777", marginLeft: 8 }}>
                                by {alert.resolvedBy}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {alert.dedupeKey && (
                        <>
                          <div style={{ color: "#777" }}>重複キー</div>
                          <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                            {alert.dedupeKey}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, color: "#555", marginBottom: 4 }}>
                        詳細
                      </div>
                      <pre
                        style={{
                          background: "white",
                          border: `1px solid ${C_BORDER}`,
                          borderRadius: 4,
                          padding: "8px 10px",
                          margin: 0,
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: "#222",
                          overflowX: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {payloadJson}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
