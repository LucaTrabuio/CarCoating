import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth, canManageStore } from '@/lib/auth';
import type { WeeklyTemplate } from '@/lib/reservation-types';

// GET: Returns weekly template for a store
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const storeId = req.nextUrl.searchParams.get('store');
    if (!storeId) {
      return NextResponse.json({ error: 'store parameter is required' }, { status: 400 });
    }
    if (!canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const snapshot = await db.collection(`shops/${storeId}/weeklyTemplate`).get();

    const template: Record<string, WeeklyTemplate> = {};
    for (const doc of snapshot.docs) {
      template[doc.id] = doc.data() as WeeklyTemplate;
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching weekly template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Saves a day's template
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { storeId, dayOfWeek, template } = body;

    if (!storeId || dayOfWeek === undefined || dayOfWeek === null) {
      return NextResponse.json({ error: 'storeId and dayOfWeek are required' }, { status: 400 });
    }
    if (!canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!template || typeof template !== 'object') {
      return NextResponse.json({ error: 'template is required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.doc(`shops/${storeId}/weeklyTemplate/${String(dayOfWeek)}`).set(template);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving weekly template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
