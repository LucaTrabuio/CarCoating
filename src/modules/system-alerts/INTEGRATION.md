# Integration checklist

Step-by-step wiring for a new consumer project. The README has the *why*; this file is the linear *what to do*.

## 0. Prerequisites in the target project

- [ ] Next.js App Router (15.x or 16.x)
- [ ] Some admin auth in place (returns `{ uid, email }` from a Bearer token)
- [ ] Some email/Slack transport for critical-notify (optional but recommended)
- [ ] A `getDailyReportRecipients()`-equivalent function (or a hardcoded list — both work)
- [ ] If using the default storage: `firebase-admin` already initialized somewhere (your `lib/firebase-admin.ts` or equivalent), exposing a `Firestore` instance

## 1. Sync the module

```bash
cd /SRC/modules/system-alerts
./sync-to.sh ../../<your-project>
```

This rsyncs `src/modules/system-alerts/` into the target. Re-run after every canonical change.

## 2. Create the instance file

`src/lib/system-alerts-instance.ts` (NEW, server-only):

```ts
import { getFirestore } from "firebase-admin/firestore";
import { createAlertsCore } from "@/modules/system-alerts";
import { createFirebaseAdminAdapter } from "@/modules/system-alerts/adapters/firebase-admin-adapter";
import type {
  AdminAuthAdapter,
  CriticalNotifier,
  RecipientsAdapter,
} from "@/modules/system-alerts";

import { verifyAdminRole } from "@/lib/admin-auth";
import { sendMail } from "@/lib/email";
import { getDailyReportRecipients } from "@/lib/notification-recipients";

const auth: AdminAuthAdapter = {
  async verifyAdmin(authHeader) {
    const admin = await verifyAdminRole(authHeader, "staff");
    return admin ? { uid: admin.uid, email: admin.email } : null;
  },
};

const notifier: CriticalNotifier = {
  async notifyCritical(alert, to) {
    await sendMail({
      to,
      subject: `🚨 ${alert.severity.toUpperCase()} — ${alert.title}`,
      html: `
        <p><strong>${alert.title}</strong></p>
        <p>source: ${alert.source}</p>
        <pre>${JSON.stringify(alert.payload ?? {}, null, 2)}</pre>
      `,
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

## 3. Mount the 4 routes

```ts
// src/app/api/admin/system-alerts/route.ts
import { createListHandler } from "@/modules/system-alerts";
import { systemAlerts, auth } from "@/lib/system-alerts-instance";
export const GET = createListHandler({ alerts: systemAlerts, auth });
```

```ts
// src/app/api/admin/system-alerts/[id]/status/route.ts
import { createStatusHandler } from "@/modules/system-alerts";
import { systemAlerts, auth } from "@/lib/system-alerts-instance";
export const POST = createStatusHandler({ alerts: systemAlerts, auth });
```

```ts
// src/app/api/admin/system-alerts/seed/route.ts   ← NOT _seed
import { createSeedHandler } from "@/modules/system-alerts";
import { systemAlerts } from "@/lib/system-alerts-instance";
export const POST = createSeedHandler({ alerts: systemAlerts });
```

```ts
// src/app/api/admin/system-alerts/purge-test/route.ts
import { createPurgeTestHandler } from "@/modules/system-alerts";
import { systemAlerts, auth } from "@/lib/system-alerts-instance";
export const POST = createPurgeTestHandler({ alerts: systemAlerts, auth });
```

## 4. Mount the admin UI

Wherever your admin shell renders sections:

```tsx
import { SystemAlertsList } from "@/modules/system-alerts";
import { getAuth } from "firebase/auth";

<SystemAlertsList
  getIdToken={async () => (await getAuth().currentUser?.getIdToken()) ?? null}
/>
```

Add a nav entry pointing to the page that renders this.

## 5. Instrument your hot paths

For every place in your codebase that currently `throw`s silently or logs an error to the server console:

```ts
import { systemAlerts } from "@/lib/system-alerts-instance";

try {
  await thingThatMightFail();
} catch (err) {
  try {
    await systemAlerts.recordAlert({
      source: "<which subsystem>",        // sync / email / auth / image / jocar / other
      severity: "error",                   // info / warning / error / critical
      title: "<one-line human description>",
      payload: { /* whatever helps triage */ },
      dedupeKey: "<stable key per failure mode>",
    });
  } catch { /* never block the caller on alert recording */ }
  throw err;
}
```

**Picking a good dedupeKey** is the most important call. The rule of thumb:

- Failure mode that should fire one alert globally (e.g. upstream API auth): single stable key like `sync:jocar-auth`
- Failure mode per-entity (e.g. one store fails to sync): include the entity ID, e.g. `sync:store:${slug}`
- Transient errors you don't want to collapse: omit dedupeKey (every occurrence becomes a new alert)

## 6. Add to the daily-report email

In your existing daily-report builder:

```ts
import { buildSystemAlertsSection } from "@/modules/system-alerts";
import { systemAlerts } from "@/lib/system-alerts-instance";

const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
const alerts = await systemAlerts.listAlerts({
  since: windowStart,
  excludeSources: ["test"],
  limit: 200,
});
const alertsHtml = buildSystemAlertsSection(alerts, {
  baseUrl: process.env.ADMIN_BASE_URL ?? "https://your-domain.example.com",
});

emailHtml = emailHtml + alertsHtml;
```

## 7. Smoke test

```bash
# 1. Seed an alert
curl -X POST http://localhost:3000/api/admin/system-alerts/seed \
  -H 'Content-Type: application/json' \
  -d '{"source":"sync","severity":"error","title":"smoke","dedupeKey":"smoke:1"}'
# → {"id":"sync:store:smoke:1","deduped":false}     (id format depends on adapter)

# 2. Seed it again — should dedupe
curl -X POST http://localhost:3000/api/admin/system-alerts/seed \
  -H 'Content-Type: application/json' \
  -d '{"source":"sync","severity":"error","title":"smoke","dedupeKey":"smoke:1"}'
# → {"id":"...","deduped":true}

# 3. List as an admin
curl http://localhost:3000/api/admin/system-alerts \
  -H "Authorization: Bearer $(your-id-token-helper)"
# → {"alerts":[{...,"occurrences":2,...}]}
```

Then open the admin UI and confirm the row shows `×2`.

## 8. (Optional) Add E2E coverage

If you have Playwright, the spec from the canonical apolloone-ucar tree is a good starting point:

```
e2e/system-alerts.spec.ts
```

10 chromium tests covering: seed-and-dedupe, list, admin renders row, expand reveals runbook+payload, 解決 button flow, daily-report preview HTML. Each test seeds with a unique `Date.now()` suffix so they don't collide across runs.

## Gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Seed route returns 404 in dev | Folder named `_seed/` instead of `seed/` | Next.js treats `_*` as private folder. Rename. |
| List returns 500 with Firestore `FAILED_PRECONDITION` | Custom storage adapter pushes severity/status into the query | Either deploy the composite index, or filter in memory like the default adapter does |
| Critical alerts never email | `notifier` or `recipients` not configured, or recipient list empty | Verify both adapters are passed to `createAlertsCore`; `recipients.getCriticalRecipients()` returns a non-empty array |
| Alert recording corrupts the calling flow | `recordAlert` not wrapped in inner try/catch at the call site | Always `try { await recordAlert(...) } catch { /* swallow */ }` — the calling flow's error must win |
| Resolved alert reappears with no metadata after re-fire | dedupeKey-as-id design — see "Important behavioral notes" in README | This is intentional. If you need history, switch to a custom storage adapter that uses auto-id + separate dedupe index |
