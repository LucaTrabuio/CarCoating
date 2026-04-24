import { NextResponse } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import {
  resetStoreOverride,
  DEFAULTABLE_KEYS,
  type DefaultableKey,
} from '@/lib/global-defaults';

// POST: reset a single section's override for a store.
// Store admins can reset their own stores; super_admins can reset any.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ storeId: string; key: string }> },
) {
  const { storeId, key } = await params;

  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!canManageStore(auth.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!(DEFAULTABLE_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json({ error: `Unknown key: ${key}` }, { status: 400 });
  }

  try {
    await resetStoreOverride(storeId, key as DefaultableKey);
    auditLog('store_override_reset', auth.user.uid, { storeId, key });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`POST /api/admin/stores/${storeId}/overrides/${key}/reset error:`, error);
    return NextResponse.json({ error: 'Failed to reset override' }, { status: 500 });
  }
}
