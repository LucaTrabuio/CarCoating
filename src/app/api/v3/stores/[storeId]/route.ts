import { NextResponse } from 'next/server';
import { getV3StoreById, upsertV3Store, softDeleteV3Store } from '@/lib/firebase-stores';
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
  try {
    const data: Partial<V3StoreData> = await request.json();
    await upsertV3Store({ ...data, store_id: storeId } as V3StoreData);
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
  try {
    await softDeleteV3Store(storeId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/v3/stores/${storeId} error:`, error);
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
  }
}
