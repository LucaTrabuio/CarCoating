import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import {
  saveGlobalDefaults,
  DEFAULTABLE_KEYS,
  type DefaultableKey,
} from '@/lib/global-defaults';

// PUT: super_admin only — flip allowOverride for a single key.
export async function PUT(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as { key?: string; allowOverride?: boolean };
    if (!body.key || typeof body.allowOverride !== 'boolean') {
      return NextResponse.json({ error: 'Missing key or allowOverride' }, { status: 400 });
    }
    if (!(DEFAULTABLE_KEYS as readonly string[]).includes(body.key)) {
      return NextResponse.json({ error: `Unknown key: ${body.key}` }, { status: 400 });
    }

    await saveGlobalDefaults(
      { policy: { [body.key as DefaultableKey]: { allowOverride: body.allowOverride } } },
      auth.user.uid,
    );
    auditLog('global_defaults_policy_update', auth.user.uid, {
      key: body.key,
      allowOverride: body.allowOverride,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/defaults/policy error:', error);
    return NextResponse.json({ error: 'Failed to save policy' }, { status: 500 });
  }
}
