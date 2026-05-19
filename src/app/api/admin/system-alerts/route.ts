// car-coating/require-auth: adapter pattern — verifyAdmin in AdminAuthAdapter
// enforces role === 'super_admin', equivalent to requireAuth('super_admin').
import { createListHandler } from '@/modules/system-alerts';
import { systemAlerts, adminAuthAdapter } from '@/lib/system-alerts-instance';

export const GET = createListHandler({ alerts: systemAlerts, auth: adminAuthAdapter });
