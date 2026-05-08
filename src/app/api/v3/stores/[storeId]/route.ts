import { NextResponse } from 'next/server';
import { getV3StoreById, upsertV3Store, softDeleteV3Store } from '@/lib/firebase-stores';
import { requireAuth, canManageStore } from '@/lib/auth';
import { v3StorePartialSchema } from '@/lib/validations';
import { auditLog } from '@/lib/audit';
import type { V3StoreData } from '@/lib/v3-types';
import {
  getGlobalDefaults,
  isSectionLocked,
  parseOverrideFlags,
  serializeOverrideFlags,
  DEFAULTABLE_KEYS,
  type DefaultableKey,
} from '@/lib/global-defaults';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  try {
    const store = await getV3StoreById(storeId);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    return NextResponse.json(store);
  } catch (error) {
    console.error(`GET /api/v3/stores/${storeId} error:`, error);
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;

  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!canManageStore(auth.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden: cannot manage this store' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = v3StorePartialSchema.safeParse({ ...body, store_id: storeId });
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', issues: result.error.issues.map(i => i.message) }, { status: 400 });
    }

    // Global-defaults enforcement: reject writes to locked sections, and mark
    // any touched defaultable field as an explicit override on the store.
    const data = result.data as V3StoreData;
    const defaults = await getGlobalDefaults();
    const touchedKeys: DefaultableKey[] = [];
    for (const key of DEFAULTABLE_KEYS) {
      if (body[key] === undefined) continue;
      if (isSectionLocked(key, defaults)) {
        return NextResponse.json(
          { error: 'section_locked', key, message: `Section "${key}" is locked by the super admin.` },
          { status: 403 },
        );
      }
      touchedKeys.push(key);
    }
    if (touchedKeys.length > 0) {
      const existing = await getV3StoreById(storeId);
      const flags = parseOverrideFlags(existing?.override_flags ?? data.override_flags);
      for (const k of touchedKeys) flags[k] = true;
      data.override_flags = serializeOverrideFlags(flags);
    }

    await upsertV3Store(data);
    auditLog('store_update', auth.user.uid, { storeId, overrideKeys: touchedKeys });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`PUT /api/v3/stores/${storeId} error:`, error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;

  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!canManageStore(auth.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden: cannot manage this store' }, { status: 403 });
  }

  try {
    await softDeleteV3Store(storeId);
    auditLog('store_delete', auth.user.uid, { storeId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/v3/stores/${storeId} error:`, error);
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
  }
}
