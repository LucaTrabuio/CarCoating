import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getStoreSettings, updateStoreSettings } from '@/lib/store-settings';

// GET: Returns store settings (calendarId, notificationEmails)
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

    const settings = await getStoreSettings(storeId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Updates store settings
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { storeId, calendarId, notificationEmails } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }
    if (!canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (calendarId !== undefined) updates.calendarId = calendarId;
    if (notificationEmails !== undefined) updates.notificationEmails = notificationEmails;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await updateStoreSettings(storeId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating store settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
