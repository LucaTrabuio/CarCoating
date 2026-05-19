// Framework- and storage-agnostic core for the system-alerts pipeline.
// Wire it up with the adapters declared in `../types.ts`:
//
//   import { createAlertsCore } from "./lib/alerts";
//   import { createFirebaseAdminAdapter } from "./adapters/firebase-admin-adapter";
//
//   const alerts = createAlertsCore({
//     storage: createFirebaseAdminAdapter({ adminDb }),
//     notifier: { notifyCritical: async (alert, to) => sendEmail(to, alert) },
//     recipients: { getCriticalRecipients: async () => ["ops@example.com"] },
//   });
//
//   await alerts.recordAlert({ source: "sync", severity: "error", title: "X", dedupeKey: "sync:store:abc" });
//
// Dedupe semantics: when `dedupeKey` is provided and an OPEN alert with that
// key already exists, the call returns `deduped: true`, bumps occurrences,
// and updates updatedAt. Title and payload from the first occurrence are
// preserved for stable triage. When no dedupeKey is provided, every call
// creates a fresh alert with auto-id.

import type {
  AlertsCore,
  AlertsCoreConfig,
  ListAlertsQuery,
  RecordAlertInput,
  SystemAlert,
  AlertSource,
  CriticalSourceAllowlist,
} from "../types";
import { sanitizeDedupeKey } from "./dedupe-key";

const DEFAULT_CRITICAL_SOURCES: CriticalSourceAllowlist = ["sync", "email", "auth"];
const DEFAULT_NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
/** Reserved dedupeKey used by the notifier to log its own failure. The core
 *  always skips re-notify for this key regardless of severity. */
const NOTIFIER_FAILURE_DEDUPE_KEY = "critical-alert-mail-failure";

export function createAlertsCore(config: AlertsCoreConfig): AlertsCore {
  const {
    storage,
    notifier,
    recipients,
    criticalSourceAllowlist = DEFAULT_CRITICAL_SOURCES,
    notifyCooldownMs = DEFAULT_NOTIFY_COOLDOWN_MS,
  } = config;

  async function maybeNotify(alert: SystemAlert): Promise<boolean> {
    if (alert.severity !== "critical") return false;
    if (alert.dedupeKey === NOTIFIER_FAILURE_DEDUPE_KEY) return false;
    if (!notifier || !recipients) return false;

    if (alert.notifiedAt && notifyCooldownMs > 0) {
      const last = new Date(alert.notifiedAt).getTime();
      if (Date.now() - last < notifyCooldownMs) return false;
    }

    const to = await recipients.getCriticalRecipients();
    if (!to.length) return false;

    try {
      await notifier.notifyCritical(alert, to);
      return true;
    } catch (err) {
      // Notifier failed — record a tracking alert with a fixed dedupeKey
      // so the next call's allowlist check still doesn't try to renotify.
      try {
        await recordInternal({
          source: "email",
          severity: "error",
          title: "Critical alert notification failed",
          payload: { alertId: alert.id, error: errorMessage(err) },
          dedupeKey: NOTIFIER_FAILURE_DEDUPE_KEY,
        });
      } catch {
        // Storage is also broken — give up silently. The original alert
        // write already succeeded; only the notification is lost.
      }
      return false;
    }
  }

  async function recordInternal(
    input: RecordAlertInput,
  ): Promise<{ id: string; deduped: boolean }> {
    const { source, title, payload, dedupeKey, _fromCriticalNotifier } = input;
    let { severity } = input;

    // Downgrade rogue critical claims to error.
    if (severity === "critical" && !criticalSourceAllowlist.includes(source)) {
      severity = "error";
    }

    // Dedupe-by-key path.
    if (dedupeKey) {
      const existing = await storage.findOpenByDedupeKey(sanitizeDedupeKey(dedupeKey));
      if (existing) {
        const shouldNotify =
          !_fromCriticalNotifier &&
          severity === "critical" &&
          dedupeKey !== NOTIFIER_FAILURE_DEDUPE_KEY &&
          (!existing.notifiedAt ||
            (notifyCooldownMs > 0 &&
              Date.now() - new Date(existing.notifiedAt).getTime() >= notifyCooldownMs));

        const bumped = await storage.bumpAlert(existing.id, {
          stampNotifiedAt: shouldNotify,
        });
        if (shouldNotify) {
          // Fire-and-forget notify; failure is non-fatal because the bump
          // already succeeded.
          maybeNotify(bumped).catch(() => undefined);
        }
        return { id: bumped.id, deduped: true };
      }
    }

    // Fresh-create path.
    const id = dedupeKey ? sanitizeDedupeKey(dedupeKey) : null;
    const willNotify =
      !_fromCriticalNotifier &&
      severity === "critical" &&
      dedupeKey !== NOTIFIER_FAILURE_DEDUPE_KEY &&
      !!notifier &&
      !!recipients;

    const created = await storage.createAlert(id, {
      source,
      severity,
      status: "open",
      title,
      payload,
      dedupeKey,
      occurrences: 1,
      notifiedAt: willNotify ? new Date().toISOString() : undefined,
    });

    if (willNotify) {
      // Same fire-and-forget pattern as above.
      maybeNotify(created).catch(() => undefined);
    }

    return { id: created.id, deduped: false };
  }

  return {
    recordAlert: recordInternal,
    listAlerts: (query: ListAlertsQuery) => storage.listAlerts(query),
    getAlertById: (id: string) => storage.getAlertById(id),
    acknowledgeAlert: (id, by) => storage.updateAlertStatus(id, { status: "acknowledged", by }),
    resolveAlert: (id, by) => storage.updateAlertStatus(id, { status: "resolved", by }),
    purgeAlertsBySource: (source: AlertSource) => storage.purgeBySource(source),
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
