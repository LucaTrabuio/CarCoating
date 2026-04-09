import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getV3StoreById } from '@/lib/firebase-stores';
import { getStoreSettings } from '@/lib/store-settings';
import { deleteCalendarEvent } from '@/lib/google-calendar';
import { sendCancellationConfirmationEmail, sendCancellationNotificationEmail } from '@/lib/email';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  try {
    const db = getAdminDb();
    const docRef = db.collection('reservations').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = doc.data()!;

    // Require cancel token for reservations that have one (legacy reservations without
    // cancelToken can still be cancelled without — remove this fallback after the grace period).
    if (data.cancelToken) {
      if (!token || token !== data.cancelToken) {
        return NextResponse.json({ error: 'Invalid or missing token' }, { status: 403 });
      }
    }

    if (data.status === 'cancelled') return NextResponse.json({ error: 'Already cancelled' }, { status: 409 });
    if (data.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 409 });

    await docRef.update({
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });

    // Delete calendar event if exists
    if (data.googleCalendarEventId && data.googleCalendarId) {
      deleteCalendarEvent(data.googleCalendarId, data.googleCalendarEventId).catch(() => {});
    }

    // Send cancellation emails
    const store = await getV3StoreById(data.storeId);
    const locationName = store?.store_name || data.storeId;
    const settings = await getStoreSettings(data.storeId);

    const results = await Promise.allSettled([
      sendCancellationConfirmationEmail({
        customerEmail: data.email,
        customerName: data.name,
        date: data.date || data.choices?.[0]?.date || '',
        time: data.time || data.choices?.[0]?.time || '',
        locationName,
        locationPhone: store?.tel || '',
      }),
      settings.notificationEmails.length > 0
        ? sendCancellationNotificationEmail({
            staffEmail: settings.notificationEmails,
            customerName: data.name,
            date: data.date || data.choices?.[0]?.date || '',
            time: data.time || data.choices?.[0]?.time || '',
            locationName,
          })
        : Promise.resolve(),
    ]);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[cancel ${id}] email ${i} failed:`, result.reason);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
