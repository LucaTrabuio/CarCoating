import { NextResponse } from 'next/server';
import { getV3StoreById, upsertV3Store, softDeleteV3Store } from '@/lib/firebase-stores';
import { requireAuth, canManageStore } from '@/lib/auth';
import { v3StorePartialSchema } from '@/lib/validations';
import { auditLog } from '@/lib/audit';
import type { V3StoreData } from '@/lib/v3-types';

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

    await upsertV3Store(result.data as V3StoreData);
    auditLog('store_update', auth.user.uid, { storeId });
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
