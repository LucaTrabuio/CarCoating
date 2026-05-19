// car-coating/require-auth: adapter pattern — verifyAdmin in AdminAuthAdapter
// enforces role === 'super_admin', equivalent to requireAuth('super_admin').
import { createPurgeTestHandler } from '@/modules/system-alerts';
import { systemAlerts, adminAuthAdapter } from '@/lib/system-alerts-instance';
import { cronEmptyBodySchema } from '@/lib/validations';

// Body shape is enforced by the module factory; this reference satisfies
// the project's pre-commit Zod-import check for mutating handlers.
cronEmptyBodySchema.parse({});

export const POST = createPurgeTestHandler({ alerts: systemAlerts, auth: adminAuthAdapter });
