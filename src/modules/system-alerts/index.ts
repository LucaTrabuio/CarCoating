// Client-safe barrel. Re-exports types, the runbook helper, the React UI,
// and the core factory. Does NOT re-export `adapters/firebase-admin-adapter`
// or any handler that statically imports server-only code — import those
// from their full paths in your server entry points so you don't accidentally
// drag firebase-admin into a client bundle.

export type {
  SystemAlert,
  AlertSeverity,
  AlertStatus,
  AlertSource,
  RecordAlertInput,
  ListAlertsQuery,
  StatusPatch,
  AlertStorageAdapter,
  AdminAuthAdapter,
  AdminIdentity,
  CriticalNotifier,
  RecipientsAdapter,
  CriticalSourceAllowlist,
  AlertsCoreConfig,
  AlertsCore,
} from "./types";

export { createAlertsCore } from "./lib/alerts";

export {
  DEFAULT_RUNBOOK_HINTS_BY_KEY,
  DEFAULT_RUNBOOK_HINTS_BY_SOURCE,
  resolveRunbookHint,
  type RunbookHintOverrides,
} from "./lib/runbook";

export { sanitizeDedupeKey } from "./lib/dedupe-key";

export { default as SystemAlertsList } from "./components/SystemAlertsList";
export type { SystemAlertsListProps } from "./components/SystemAlertsList";

// Server-only — these are safe to import here because they don't statically
// reference firebase-admin (the adapter does, but the handlers receive an
// AlertsCore instance from the consumer):
export { createListHandler } from "./api/list-handler";
export type { ListHandlerConfig } from "./api/list-handler";
export { createStatusHandler } from "./api/status-handler";
export type { StatusHandlerConfig } from "./api/status-handler";
export { createSeedHandler } from "./api/seed-handler";
export type { SeedHandlerConfig } from "./api/seed-handler";
export { createPurgeTestHandler } from "./api/purge-test-handler";
export type { PurgeTestHandlerConfig } from "./api/purge-test-handler";
export {
  buildSystemAlertsSection,
  type BuildSystemAlertsSectionOptions,
} from "./api/daily-report-section";
