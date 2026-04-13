import { NextResponse } from 'next/server';
import { getAllV3Stores, getAllV3StoresIncludingInactive, upsertV3Stores, parseCSVToV3Stores } from '@/lib/firebase-stores';
import { requireAuth } from '@/lib/auth';
import { v3StoreWriteSchema } from '@/lib/validations';
import { MAX_BATCH_STORES } from '@/lib/constants';
import { auditLog } from '@/lib/audit';
import type { V3StoreData } from '@/lib/v3-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    // Including inactive stores requires any authenticated admin
    if (includeInactive) {
      const auth = await requireAuth();
      if (auth.error) return auth.error;
    }

    const stores = includeInactive
      ? await getAllV3StoresIncludingInactive()
      : await getAllV3Stores();
    return NextResponse.json(stores);
  } catch (error) {
    console.error('GET /api/v3/stores error:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const contentType = request.headers.get('content-type') || '';
    let stores: V3StoreData[];

    if (contentType.includes('text/csv')) {
      const csvText = await request.text();
      stores = parseCSVToV3Stores(csvText);
    } else {
      stores = await request.json();
    }

    if (!Array.isArray(stores) || stores.length === 0) {
      return NextResponse.json({ error: 'No valid stores provided' }, { status: 400 });
    }

    if (stores.length > MAX_BATCH_STORES) {
      return NextResponse.json({ error: `Batch size exceeds maximum of ${MAX_BATCH_STORES}` }, { status: 400 });
    }

    // Validate each store
    const errors: string[] = [];
    const validated: V3StoreData[] = [];
    for (const store of stores) {
      const result = v3StoreWriteSchema.safeParse(store);
      if (!result.success) {
        errors.push(`${store.store_id || 'unknown'}: ${result.error.issues.map(i => i.message).join(', ')}`);
      } else {
        validated.push(result.data as V3StoreData);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', issues: errors }, { status: 400 });
    }

    await upsertV3Stores(validated);
    auditLog('stores_bulk_upsert', auth.user.uid, { count: validated.length });
    return NextResponse.json({ success: true, count: validated.length });
  } catch (error) {
    console.error('POST /api/v3/stores error:', error);
    return NextResponse.json({ error: 'Failed to save stores' }, { status: 500 });
  }
}
