import { NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import { stores as hardcodedStores } from '@/data/stores';
import { StoreData } from '@/lib/types';
import { requireAuth } from '@/lib/auth';

const BLOB_KEY = 'stores.json';

// GET: return merged store data
export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url);
      const importedStores: StoreData[] = await res.json();
      // Merge: hardcoded as base, imported as overrides
      const mergedMap = new Map<string, StoreData>();
      hardcodedStores.forEach(s => mergedMap.set(s.store_id, s));
      importedStores.forEach(s => mergedMap.set(s.store_id, s));
      return NextResponse.json(Array.from(mergedMap.values()));
    }
  } catch (e) {
    console.error('Blob read error:', e);
  }
  return NextResponse.json(hardcodedStores);
}

// POST: save imported stores to blob
export async function POST(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const stores: StoreData[] = await request.json();
    if (!Array.isArray(stores) || stores.length > 10000) {
      return NextResponse.json({ error: 'Invalid stores payload' }, { status: 400 });
    }
    // Clean up old blob
    const { blobs } = await list({ prefix: BLOB_KEY });
    for (const blob of blobs) await del(blob.url);
    // Save new
    await put(BLOB_KEY, JSON.stringify(stores), {
      access: 'public',
      contentType: 'application/json',
    });
    return NextResponse.json({ success: true, count: stores.length });
  } catch (e) {
    console.error('Blob write error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
