import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth, canManageStore } from '@/lib/auth';
import type { DateOverride } from '@/lib/reservation-types';

// GET: Returns date overrides for a store/month
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const storeId = req.nextUrl.searchParams.get('store');
    const month = req.nextUrl.searchParams.get('month'); // YYYY-MM

    if (!storeId) {
      return NextResponse.json({ error: 'store parameter is required' }, { status: 400 });
    }
    if (!canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const snapshot = await db.collection(`shops/${storeId}/dateOverrides`).get();

    const overrides: Record<string, DateOverride> = {};
    for (const doc of snapshot.docs) {
      // Filter by month prefix if provided
      if (month && !doc.id.startsWith(month)) continue;
      overrides[doc.id] = doc.data() as DateOverride;
    }

    return NextResponse.json({ overrides });
  } catch (error) {
    console.error('Error fetching date overrides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Saves a date override
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { storeId, date, override } = body;

    if (!storeId || !date) {
      return NextResponse.json({ error: 'storeId and date are required' }, { status: 400 });
    }
    if (!canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!override || typeof override !== 'object') {
      return NextResponse.json({ error: 'override is required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.doc(`shops/${storeId}/dateOverrides/${date}`).set(override);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving date override:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
