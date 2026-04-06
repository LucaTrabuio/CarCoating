import { NextResponse } from 'next/server';
import { getAllV3Stores, getAllV3StoresIncludingInactive, upsertV3Stores, parseCSVToV3Stores } from '@/lib/firebase-stores';
import type { V3StoreData } from '@/lib/v3-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';
    const stores = includeInactive
      ? await getAllV3StoresIncludingInactive()
      : await getAllV3Stores();
    return NextResponse.json(stores);
  } catch (error) {
    console.error('GET /api/v3/stores error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch stores', detail: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    await upsertV3Stores(stores);
    return NextResponse.json({ success: true, count: stores.length });
  } catch (error) {
    console.error('POST /api/v3/stores error:', error);
    return NextResponse.json({ error: 'Failed to save stores' }, { status: 500 });
  }
}
