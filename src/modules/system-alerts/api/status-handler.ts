// Factory for POST /api/admin/system-alerts/[id]/status.
// Body: { action: "acknowledge" | "resolve" }
//
// Usage (Next.js App Router):
//   // src/app/api/admin/system-alerts/[id]/status/route.ts
//   import { createStatusHandler } from "@/modules/system-alerts/api/status-handler";
//   import { alerts, auth } from "@/lib/system-alerts-instance";
//   export const POST = createStatusHandler({ alerts, auth });

import type { AlertsCore, AdminAuthAdapter } from "../types";

export interface StatusHandlerConfig {
  alerts: AlertsCore;
  auth: AdminAuthAdapter;
}

/** Next.js App Router passes a `{ params }` second arg whose `params` is a
 *  Promise in Next 16+. We deliberately accept and `await` it so the handler
 *  works on both Next 15 (sync) and Next 16+ (async) without changes. */
type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export function createStatusHandler({ alerts, auth }: StatusHandlerConfig) {
  return async function POST(request: Request, ctx: RouteContext): Promise<Response> {
    const admin = await auth.verifyAdmin(request.headers.get("authorization"));
    if (!admin) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(ctx.params);
    const id = params.id;

    let body: { action?: string };
    try {
      body = (await request.json()) as { action?: string };
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const action = body.action;
    if (action !== "acknowledge" && action !== "resolve") {
      return Response.json({ error: "invalid_action" }, { status: 400 });
    }

    const existing = await alerts.getAlertById(id);
    if (!existing) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    if (action === "acknowledge") {
      await alerts.acknowledgeAlert(id, admin.email);
    } else {
      await alerts.resolveAlert(id, admin.email);
    }
    return Response.json({ ok: true });
  };
}
