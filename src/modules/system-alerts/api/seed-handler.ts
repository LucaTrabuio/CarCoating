// Factory for the dev-only POST /api/admin/system-alerts/seed route used by
// integration tests (Playwright/Vitest) to plant alerts without invoking a
// real backend hot path. Returns 404 in production regardless of body — the
// route is only reachable in dev/test environments.
//
// IMPORTANT: the folder MUST NOT be named "_seed" — Next.js App Router treats
// underscore-prefixed segments as private folders and excludes them from
// routing. Use "seed" (or any non-underscore name).
//
// Usage:
//   // src/app/api/admin/system-alerts/seed/route.ts
//   import { createSeedHandler } from "@/modules/system-alerts/api/seed-handler";
//   import { alerts } from "@/lib/system-alerts-instance";
//   export const POST = createSeedHandler({ alerts });

import type {
  AlertsCore,
  AlertSeverity,
  AlertSource,
} from "../types";

export interface SeedHandlerConfig {
  alerts: AlertsCore;
  /** Override the env check. Defaults to `process.env.NODE_ENV !== "production"`. */
  isAllowed?: () => boolean;
}

export function createSeedHandler({
  alerts,
  isAllowed = () => process.env.NODE_ENV !== "production",
}: SeedHandlerConfig) {
  return async function POST(request: Request): Promise<Response> {
    if (!isAllowed()) {
      return new Response(null, { status: 404 });
    }

    let body: {
      source?: AlertSource;
      severity?: AlertSeverity;
      title?: string;
      payload?: Record<string, unknown>;
      dedupeKey?: string;
    };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!body.source || !body.severity || !body.title) {
      return Response.json(
        { error: "source, severity, title required" },
        { status: 400 },
      );
    }

    const result = await alerts.recordAlert({
      source: body.source,
      severity: body.severity,
      title: body.title,
      payload: body.payload,
      dedupeKey: body.dedupeKey,
    });
    return Response.json(result);
  };
}
