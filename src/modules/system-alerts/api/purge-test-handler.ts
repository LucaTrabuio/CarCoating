// Factory for POST /api/admin/system-alerts/purge-test.
// Bulk-deletes every alert with source === "test". Wired to a dedicated
// source rather than a free-form parameter so a misclick can never wipe
// real alerts (sync / email / auth).
//
// Usage:
//   // src/app/api/admin/system-alerts/purge-test/route.ts
//   import { createPurgeTestHandler } from "@/modules/system-alerts/api/purge-test-handler";
//   import { alerts, auth } from "@/lib/system-alerts-instance";
//   export const POST = createPurgeTestHandler({ alerts, auth });

import type { AlertsCore, AdminAuthAdapter } from "../types";

export interface PurgeTestHandlerConfig {
  alerts: AlertsCore;
  auth: AdminAuthAdapter;
  /** Override the source to purge. Defaults to "test". */
  source?: string;
}

export function createPurgeTestHandler({
  alerts,
  auth,
  source = "test",
}: PurgeTestHandlerConfig) {
  return async function POST(request: Request): Promise<Response> {
    const admin = await auth.verifyAdmin(request.headers.get("authorization"));
    if (!admin) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const deleted = await alerts.purgeAlertsBySource(source);
    return Response.json({ deleted });
  };
}
