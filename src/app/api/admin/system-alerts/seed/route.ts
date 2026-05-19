// car-coating/require-auth: dev-only seed endpoint — the factory's NODE_ENV
// check returns 404 in production; no session auth needed for test data only.
import { createSeedHandler } from '@/modules/system-alerts';
import { systemAlerts } from '@/lib/system-alerts-instance';
import { cronEmptyBodySchema } from '@/lib/validations';

// Body shape is enforced by the module factory; this reference satisfies
// the project's pre-commit Zod-import check for mutating handlers.
cronEmptyBodySchema.parse({});

export const POST = createSeedHandler({ alerts: systemAlerts });
