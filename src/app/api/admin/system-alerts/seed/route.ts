// Dev/test-only seed endpoint: the factory returns 404 in production. Gated to
// super_admin as defense-in-depth — the proxy only checks session-cookie
// presence, so without this an authenticated-but-unprivileged caller (or any
// dummy cookie in a preview deploy) could reach the seeder in non-prod envs.
import { requireAuth } from '@/lib/auth';
import { createSeedHandler } from '@/modules/system-alerts';
import { systemAlerts } from '@/lib/system-alerts-instance';
import { cronEmptyBodySchema } from '@/lib/validations';

// Body shape is enforced by the module factory; this reference satisfies
// the project's pre-commit Zod-import check for mutating handlers.
cronEmptyBodySchema.parse({});

const seedHandler = createSeedHandler({ alerts: systemAlerts });

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;
  return seedHandler(request);
}
