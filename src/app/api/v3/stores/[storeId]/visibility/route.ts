import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth, canManageStore } from '@/lib/auth';
import { storeVisibilityPatchSchema } from '@/lib/validations';
import { auditLog } from '@/lib/audit';
import { FieldValue, type UpdateData, type DocumentData } from 'firebase-admin/firestore';

const STORES_COLLECTION = 'stores';

export async function PATCH(
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
    const result = storeVisibilityPatchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: result.error.issues.map(i => i.message) },
        { status: 400 },
      );
    }

    const data = result.data;
    const update: UpdateData<DocumentData> = {};

    if (data.hide_mode === 'manual') {
      update.hide_mode = 'manual';
      update.seasonal_hide_start = FieldValue.delete();
      update.seasonal_hide_end = FieldValue.delete();
    } else if (data.hide_mode === 'seasonal') {
      update.hide_mode = 'seasonal';
      update.seasonal_hide_start = data.seasonal_hide_start;
      update.seasonal_hide_end = data.seasonal_hide_end;
    } else {
      // null → clear all visibility overrides
      update.hide_mode = FieldValue.delete();
      update.seasonal_hide_start = FieldValue.delete();
      update.seasonal_hide_end = FieldValue.delete();
    }

    await getAdminDb().collection(STORES_COLLECTION).doc(storeId).update(update);
    auditLog('store_visibility_update', auth.user.uid, { storeId, hide_mode: data.hide_mode });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`PATCH /api/v3/stores/${storeId}/visibility error:`, error);
    return NextResponse.json({ error: 'Failed to update store visibility' }, { status: 500 });
  }
}
