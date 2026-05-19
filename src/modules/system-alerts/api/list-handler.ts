// Factory for GET /api/admin/system-alerts.
//
// Usage (Next.js App Router):
//   // src/app/api/admin/system-alerts/route.ts
//   import { createListHandler } from "@/modules/system-alerts/api/list-handler";
//   import { alerts, auth } from "@/lib/system-alerts-instance";
//   export const GET = createListHandler({ alerts, auth });

import type { AlertsCore, AdminAuthAdapter, AlertSeverity, AlertStatus } from "../types";

export interface ListHandlerConfig {
  alerts: AlertsCore;
  auth: AdminAuthAdapter;
}

export function createListHandler({ alerts, auth }: ListHandlerConfig) {
  return async function GET(request: Request): Promise<Response> {
    const admin = await auth.verifyAdmin(request.headers.get("authorization"));
    if (!admin) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const sp = url.searchParams;

    const statusParam = sp.get("status");
    const status: AlertStatus[] | undefined = statusParam
      ? (statusParam.split(",").filter(Boolean) as AlertStatus[])
      : undefined;

    const severityParam = sp.get("severity");
    const severity: AlertSeverity[] | undefined = severityParam
      ? (severityParam.split(",").filter(Boolean) as AlertSeverity[])
      : undefined;

    const sinceParam = sp.get("since");
    const since = sinceParam ? new Date(sinceParam) : undefined;

    const sourcesParam = sp.get("sources");
    const sources = sourcesParam ? sourcesParam.split(",").filter(Boolean) : undefined;

    const excludeSourcesParam = sp.get("excludeSources");
    const excludeSources = excludeSourcesParam
      ? excludeSourcesParam.split(",").filter(Boolean)
      : undefined;

    const limitParam = sp.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100;

    const list = await alerts.listAlerts({
      since,
      severity,
      status,
      sources,
      excludeSources,
      limit,
    });
    return Response.json({ alerts: list });
  };
}
