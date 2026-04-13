import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getStoreSettings, updateStoreSettings } from '@/lib/store-settings';
import { google } from 'googleapis';

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

// POST: Special actions (e.g., calendar invite)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { storeId, action, email } = body;

    if (!storeId || !canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'invite') {
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
      }

      const settings = await getStoreSettings(storeId);
      if (!settings.calendarId) {
        return NextResponse.json({ error: 'This store has no Google Calendar configured' }, { status: 400 });
      }

      // Use service account to share the calendar with the provided email
      const serviceAuth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      const calendar = google.calendar({ version: 'v3', auth: serviceAuth });

      await calendar.acl.insert({
        calendarId: settings.calendarId,
        sendNotifications: true,
        requestBody: {
          role: 'reader',
          scope: { type: 'user', value: email },
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Store settings action error:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
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
