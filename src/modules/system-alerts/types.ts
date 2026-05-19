// Public types for the system-alerts module. Safe to import from client code.

export type AlertSeverity = "critical" | "error" | "warning" | "info";
export type AlertStatus = "open" | "acknowledged" | "resolved";

// Open string so consumers can add their own sources without modifying the
// module. The built-in flow uses "sync" | "email" | "auth" | "image" | "jocar"
// | "other" | "test", but anything is allowed.
export type AlertSource = string;

export interface SystemAlert {
  id: string;
  source: AlertSource;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
  occurrences: number;
  createdAt: string; // ISO 8601
  updatedAt: string;
  notifiedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface RecordAlertInput {
  source: AlertSource;
  severity: AlertSeverity;
  title: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
  /** Internal flag — set when the notifier itself is invoking recordAlert to
   *  log its own failure. Prevents critical-alert-mail-failure recursion. */
  _fromCriticalNotifier?: boolean;
}

export interface ListAlertsQuery {
  since?: Date;
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  sources?: AlertSource[];
  excludeSources?: AlertSource[];
  limit?: number;
}

export interface StatusPatch {
  status: "acknowledged" | "resolved";
  by: string;
}

// ─── Adapter contracts ────────────────────────────────────────────────────

/**
 * Persistence. Implement against your DB of choice (Firestore by default —
 * see `adapters/firebase-admin-adapter.ts`).
 *
 * Dedupe contract: when recordAlert is called with a `dedupeKey`, the storage
 * layer is responsible for "find-or-bump" semantics. Either:
 *   (a) use the sanitized dedupeKey as the document ID, or
 *   (b) query by dedupeKey and merge — but the result MUST be atomic per key
 *       (no race-condition double-writes).
 * Firestore impl uses (a) for atomicity without needing a transaction.
 */
export interface AlertStorageAdapter {
  /** Find the open alert with this dedupeKey, or null. */
  findOpenByDedupeKey(dedupeKey: string): Promise<SystemAlert | null>;
  /** Increment occurrences + bump updatedAt + optionally stamp notifiedAt
   *  on an existing alert. */
  bumpAlert(
    id: string,
    opts: { stampNotifiedAt?: boolean },
  ): Promise<SystemAlert>;
  /** Create a new alert. When `id` is provided, use it (dedupeKey-as-id path);
   *  otherwise auto-generate. */
  createAlert(
    id: string | null,
    data: Omit<SystemAlert, "id" | "createdAt" | "updatedAt" | "occurrences"> & {
      occurrences?: number;
      notifiedAt?: string;
    },
  ): Promise<SystemAlert>;
  listAlerts(query: ListAlertsQuery): Promise<SystemAlert[]>;
  getAlertById(id: string): Promise<SystemAlert | null>;
  updateAlertStatus(id: string, patch: StatusPatch): Promise<void>;
  /** Delete every alert with source === source. Returns count deleted. */
  purgeBySource(source: AlertSource): Promise<number>;
}

/**
 * Admin auth check. Consumers wrap their existing role-check.
 * Return null when the request is not from an admin (the route returns 401).
 */
export interface AdminAuthAdapter {
  verifyAdmin(authHeader: string | null): Promise<AdminIdentity | null>;
}

export interface AdminIdentity {
  uid: string;
  email: string;
}

/**
 * How to dispatch a critical-severity alert immediately (vs. waiting for the
 * daily-report digest). Consumers wire this to their email/Slack/webhook.
 * Any throw is caught by the alerts core — the alert write is never lost
 * because of a transport failure.
 */
export interface CriticalNotifier {
  notifyCritical(alert: SystemAlert, recipients: string[]): Promise<void>;
}

/**
 * Who receives critical-alert notifications. Usually wraps the same
 * recipient source the daily-report uses, so operators don't get a separate
 * inbox.
 */
export interface RecipientsAdapter {
  getCriticalRecipients(): Promise<string[]>;
}

/** Sources that are allowed to mark themselves "critical". Anything else
 *  gets silently downgraded to "error" before write. Defaults to
 *  ["sync", "email", "auth"]. */
export type CriticalSourceAllowlist = AlertSource[];

export interface AlertsCoreConfig {
  storage: AlertStorageAdapter;
  notifier?: CriticalNotifier;
  recipients?: RecipientsAdapter;
  /** Override the default allowlist of sources allowed to be "critical". */
  criticalSourceAllowlist?: CriticalSourceAllowlist;
  /** Override the default 6-hour cooldown for re-notifying on the same
   *  dedupeKey. Set to 0 to disable cooldown (notify on every occurrence). */
  notifyCooldownMs?: number;
}

export interface AlertsCore {
  recordAlert(input: RecordAlertInput): Promise<{ id: string; deduped: boolean }>;
  listAlerts(query: ListAlertsQuery): Promise<SystemAlert[]>;
  getAlertById(id: string): Promise<SystemAlert | null>;
  acknowledgeAlert(id: string, by: string): Promise<void>;
  resolveAlert(id: string, by: string): Promise<void>;
  purgeAlertsBySource(source: AlertSource): Promise<number>;
}
