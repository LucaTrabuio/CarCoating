import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import {
  getGlobalDefaults,
  saveGlobalDefaults,
  DEFAULTABLE_KEYS,
  type DefaultableKey,
  type PolicyEntry,
} from '@/lib/global-defaults';

// GET: any authenticated user — values are public (they render on storefronts);
// store admins need to know policy + current defaults to render their builder.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const defaults = await getGlobalDefaults();
    return NextResponse.json(defaults);
  } catch (error) {
    console.error('GET /api/admin/defaults error:', error);
    return NextResponse.json({ error: 'Failed to load defaults' }, { status: 500 });
  }
}

// PUT: super_admin only — accepts partial { values?, policy? }.
export async function PUT(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as {
      values?: Partial<Record<string, string>>;
      policy?: Partial<Record<string, PolicyEntry>>;
    };

    // Whitelist keys to prevent arbitrary writes.
    const allowed = new Set<string>(DEFAULTABLE_KEYS as readonly string[]);
    const values: Partial<Record<DefaultableKey, string>> = {};
    const policy: Partial<Record<DefaultableKey, PolicyEntry>> = {};

    if (body.values) {
      for (const [k, v] of Object.entries(body.values)) {
        if (!allowed.has(k)) continue;
        if (typeof v !== 'string') continue;
        values[k as DefaultableKey] = v;
      }
    }
    if (body.policy) {
      for (const [k, v] of Object.entries(body.policy)) {
        if (!allowed.has(k)) continue;
        if (!v || typeof v.allowOverride !== 'boolean') continue;
        policy[k as DefaultableKey] = { allowOverride: v.allowOverride };
      }
    }

    await saveGlobalDefaults({ values, policy }, auth.user.uid);
    auditLog('global_defaults_update', auth.user.uid, {
      keysChanged: [...Object.keys(values), ...Object.keys(policy)],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/defaults error:', error);
    return NextResponse.json({ error: 'Failed to save defaults' }, { status: 500 });
  }
}
