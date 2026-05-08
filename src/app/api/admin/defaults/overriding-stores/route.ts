import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DEFAULTABLE_KEYS, listStoresOverriding, type DefaultableKey } from '@/lib/global-defaults';

// GET: super_admin only — list stores overriding the given section key.
export async function GET(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const key = req.nextUrl.searchParams.get('key');
  if (!key || !(DEFAULTABLE_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json({ error: `Unknown or missing key: ${key}` }, { status: 400 });
  }

  try {
    const stores = await listStoresOverriding(key as DefaultableKey);
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('GET /api/admin/defaults/overriding-stores error:', error);
    return NextResponse.json({ error: 'Failed to list overriding stores' }, { status: 500 });
  }
}
