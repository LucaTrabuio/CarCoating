# System Alerts Module

Reusable, framework-portable backend health-alert pipeline. Provides:

- `recordAlert()` helper for instrumenting backend hot paths (sync jobs, email send, auth flows, …) so silent failures become visible
- Dedupe-by-key so a flapping condition collapses into one row with an occurrence counter instead of spamming the table
- Severity allowlist — only trusted sources may mark themselves `critical`; anything else is downgraded to `error`
- Immediate critical-notify with a configurable cooldown (default 6h) — wires to your email/Slack/webhook transport
- Admin list UI with severity/status/source filter chips, expand-row payload + runbook hint, ack/resolve buttons, bulk test-data purge
- Daily-report HTML section builder for digest emails (cards with payload preview + runbook hint, grouped by severity)
- Storage-agnostic core; default adapter for Firestore via `firebase-admin`

## Adapter contract

The module is intentionally pluggable. Consumers supply four adapters:

| Adapter | Purpose | Default impl |
|---|---|---|
| `AlertStorageAdapter` | Read/write alerts. Owns the dedupe semantics. | `adapters/firebase-admin-adapter.ts` (Firestore) |
| `AdminAuthAdapter` | Verify the request's `Authorization: Bearer ...` token; return `{ uid, email }` for admins, `null` otherwise. | none — wire your existing role check |
| `CriticalNotifier` | Send an immediate notification for a `critical` severity alert. | none — wire your email transport |
| `RecipientsAdapter` | Provide the list of email addresses (or other identifiers) that should receive critical notifications. | none — usually wraps your daily-report recipient source |

Only `AlertStorageAdapter` is mandatory. Omit `notifier` + `recipients` to drop critical-notify; the alerts still record and surface in the admin UI / daily report.

## Quickstart (Next.js + Firestore)

### 1. Sync into your project

```bash
cd /SRC/modules/system-alerts
./sync-to.sh ../../<consumer-project>
# → consumer/src/modules/system-alerts/
```

### 2. Create a server-only instance file

```ts
// src/lib/system-alerts-instance.ts  (server-only — never import from client)
import { getFirestore } from "firebase-admin/firestore";
import { createAlertsCore } from "@/modules/system-alerts";
import { createFirebaseAdminAdapter } from "@/modules/system-alerts/adapters/firebase-admin-adapter";
import type { AdminAuthAdapter, CriticalNotifier, RecipientsAdapter } from "@/modules/system-alerts";

import { verifyAdminRole } from "@/lib/admin-auth";          // your existing
import { sendMail } from "@/lib/email";                       // your existing
import { getDailyReportRecipients } from "@/lib/notification-recipients";

const auth: AdminAuthAdapter = {
  async verifyAdmin(authHeader) {
    const admin = await verifyAdminRole(authHeader, "staff");
    return admin ? { uid: admin.uid, email: admin.email } : null;
  },
};

const notifier: CriticalNotifier = {
  async notifyCritical(alert, recipients) {
    await sendMail({
      to: recipients,
      subject: `🚨 ${alert.severity.toUpperCase()} — ${alert.title}`,
      html: `<pre>${JSON.stringify(alert.payload ?? {}, null, 2)}</pre>`,
    });
  },
};

const recipients: RecipientsAdapter = {
  getCriticalRecipients: () => getDailyReportRecipients(),
};

export const systemAlerts = createAlertsCore({
  storage: createFirebaseAdminAdapter({ adminDb: getFirestore() }),
  notifier,
  recipients,
});

export { auth };
```

### 3. Mount the API routes

```ts
// src/app/api/admin/system-alerts/route.ts
export { GET } from "@/modules/system-alerts/api/list-handler";
// or, explicitly:
//   import { createListHandler } from "@/modules/system-alerts/api/list-handler";
//   import { systemAlerts, auth } from "@/lib/system-alerts-instance";
//   export const GET = createListHandler({ alerts: systemAlerts, auth });
```

Repeat for:

```
src/app/api/admin/system-alerts/[id]/status/route.ts   → createStatusHandler
src/app/api/admin/system-alerts/seed/route.ts          → createSeedHandler   (DO NOT name the folder _seed)
src/app/api/admin/system-alerts/purge-test/route.ts    → createPurgeTestHandler
```

### 4. Mount the admin UI

```tsx
// wherever your admin shell renders sections
import { SystemAlertsList } from "@/modules/system-alerts";
import { getAuth } from "firebase/auth";

<SystemAlertsList
  getIdToken={async () => (await getAuth().currentUser?.getIdToken()) ?? null}
  apiBasePath="/api/admin/system-alerts"
/>
```

### 5. Wire recordAlert into your hot paths

```ts
// e.g. inside your per-store sync route
import { systemAlerts } from "@/lib/system-alerts-instance";

try {
  await syncStore(slug);
} catch (err) {
  try {
    await systemAlerts.recordAlert({
      source: "sync",
      severity: "error",
      title: `Store sync failed: ${slug}`,
      payload: { slug, message: errorMessage(err) },
      dedupeKey: `sync:store:${slug}`,
    });
  } catch { /* never let alert-recording corrupt the calling flow */ }
  throw err;
}
```

For JOCAR-style upstream auth failures:

```ts
if (res.status === 401 || res.status === 403) {
  await systemAlerts.recordAlert({
    source: "sync",
    severity: "critical",            // → triggers immediate notify
    title: "Upstream API auth failure",
    payload: { status: res.status, region },
    dedupeKey: "sync:upstream-auth",  // global key → one alert for fan-out
  });
}
```

### 6. Add the section to your daily-report email

```ts
import { buildSystemAlertsSection } from "@/modules/system-alerts";
import { systemAlerts } from "@/lib/system-alerts-instance";

const windowStart = /* 24h ago, in your tz */;
const alerts = await systemAlerts.listAlerts({
  since: windowStart,
  excludeSources: ["test"],      // hide Playwright fixtures from operators
  limit: 200,
});
const html = buildSystemAlertsSection(alerts, {
  baseUrl: process.env.ADMIN_BASE_URL!,
  // adminPath: "/admin?section=global-system-alerts",  // default
});

emailBody = emailBody + html;
```

## Schema (default Firestore impl)

Collection: `systemAlerts/{id}`

```
{
  source: string                  // "sync" | "email" | "auth" | ... | "test"
  severity: "critical" | "error" | "warning" | "info"
  status: "open" | "acknowledged" | "resolved"
  title: string
  payload?: object                // arbitrary, JSON-serializable
  dedupeKey?: string              // when present, used as the doc ID after sanitization
  occurrences: number             // starts at 1, FieldValue.increment on dedupe
  createdAt, updatedAt: Timestamp
  notifiedAt?: Timestamp          // last critical-notify dispatch
  acknowledgedAt?, acknowledgedBy?: Timestamp / string
  resolvedAt?, resolvedBy?: Timestamp / string
}
```

No composite index is required — the default adapter sidesteps the `where + orderBy` combination by over-fetching by createdAt and filtering severity/status/source in memory. Acceptable at low alert volume; override the adapter if your scale demands it.

## Important behavioral notes

- **Dedupe-as-id semantics:** when `dedupeKey` is provided, the alert's doc ID is the sanitized dedupeKey. This makes find-or-bump atomic without a transaction. The side effect is that an old `resolved`/`acknowledged` alert at the same dedupeKey is **overwritten** back to `open` on re-fire — by design, but it erases the prior resolved metadata at that key. Document this in your audit story if it matters.
- **Critical-notify recursion guard:** if the notifier itself throws, the core records `email/error` with `dedupeKey: "critical-alert-mail-failure"` so the failure is visible — and skips re-notify for that exact key regardless of severity. Set `notifyCooldownMs: 0` only if you want every occurrence to attempt re-notify.
- **`_seed` is a Next.js private folder:** routing-related. Always name the dev-seed route folder `seed`, not `_seed`. The factory's runtime check (`process.env.NODE_ENV !== "production"`) is independent — the folder-name issue is a separate trap.
- **`Authorization` header convention:** the included handlers read the raw header value and pass it to `AdminAuthAdapter.verifyAdmin`. Your adapter is responsible for parsing `Bearer <token>` or whatever scheme you use.
- **Server-only code is segregated:** `adapters/firebase-admin-adapter.ts` is NOT re-exported from `index.ts` so it can't accidentally be pulled into a client bundle. Import it from its full path in your server-only entry file.

## Files

```
modules/system-alerts/
├── README.md                                      ← you are here
├── sync-to.sh
├── index.ts                                       ← client-safe barrel
├── types.ts                                       ← public interfaces
├── lib/
│   ├── alerts.ts                                  ← createAlertsCore(config) → AlertsCore
│   ├── runbook.ts                                 ← hint maps + resolveRunbookHint
│   └── dedupe-key.ts                              ← sanitizeDedupeKey
├── adapters/
│   └── firebase-admin-adapter.ts                  ← Firestore impl (SERVER ONLY)
├── api/
│   ├── list-handler.ts                            ← GET /api/admin/system-alerts
│   ├── status-handler.ts                          ← POST /api/admin/system-alerts/[id]/status
│   ├── seed-handler.ts                            ← POST /api/admin/system-alerts/seed (dev only)
│   ├── purge-test-handler.ts                      ← POST /api/admin/system-alerts/purge-test
│   └── daily-report-section.ts                    ← buildSystemAlertsSection (pure HTML)
└── components/
    └── SystemAlertsList.tsx                       ← admin UI client component
```

## Peer dependencies

| Package | Required for | Required version |
|---|---|---|
| `react` | `components/SystemAlertsList.tsx` | 18.x or 19.x |
| `next` | API route handlers, App Router conventions | 15.x or 16.x |
| `firebase-admin` | `adapters/firebase-admin-adapter.ts` (only if you use it) | 12.x+ |

No runtime dependencies of its own.

## Verification

The module ships without its own test suite — verify in the consumer project. After wiring, the smoke test is:

```bash
# in your consumer project
curl -s -X POST http://localhost:3000/api/admin/system-alerts/seed \
  -H 'Content-Type: application/json' \
  -d '{"source":"sync","severity":"error","title":"smoke test","dedupeKey":"smoke:1"}'

# expect: {"id":"...","deduped":false}

# do it again:
curl -s -X POST http://localhost:3000/api/admin/system-alerts/seed \
  -H 'Content-Type: application/json' \
  -d '{"source":"sync","severity":"error","title":"smoke test","dedupeKey":"smoke:1"}'

# expect: {"id":"...","deduped":true}
```

Then open `/admin?section=global-system-alerts` (or whatever path your admin shell maps to) and confirm the row shows `×2`.
