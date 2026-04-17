import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth, canManageStore } from '@/lib/auth';
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { sendConfirmationEmail, sendCancellationConfirmationEmail, sendCancellationNotificationEmail } from '@/lib/email';
import { getV3StoreById } from '@/lib/firebase-stores';
import { getStoreSettings } from '@/lib/store-settings';
import { bookingPatchSchema } from '@/lib/validations';
import type { Reservation } from '@/lib/reservation-types';

// GET: Fetch reservations for a store, or all visible stores when no store param
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { searchParams } = req.nextUrl;
    const storeId = searchParams.get('store');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const db = getAdminDb();
    let reservations: Array<{ id: string; [key: string]: unknown }> = [];

    if (storeId && storeId !== 'all') {
      if (!canManageStore(user, storeId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      let query: FirebaseFirestore.Query = db.collection('reservations').where('storeId', '==', storeId);
      if (from) query = query.where('date', '>=', from);
      if (to) query = query.where('date', '<=', to);
      const snap = await query.get();
      reservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else if (user.role === 'super_admin') {
      let query: FirebaseFirestore.Query = db.collection('reservations');
      if (from) query = query.where('date', '>=', from);
      if (to) query = query.where('date', '<=', to);
      const snap = await query.get();
      reservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const stores = user.managed_stores || [];
      if (stores.length === 0) {
        return NextResponse.json({ reservations: [] });
      }
      // Firestore 'in' filter is limited to 30 values per query
      for (let i = 0; i < stores.length; i += 30) {
        const chunk = stores.slice(i, i + 30);
        const snap = await db.collection('reservations').where('storeId', 'in', chunk).get();
        snap.docs.forEach(d => reservations.push({ id: d.id, ...d.data() }));
      }
      if (from) reservations = reservations.filter(r => typeof r.date === 'string' && r.date >= from);
      if (to) reservations = reservations.filter(r => typeof r.date === 'string' && r.date <= to);
    }

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update reservation status
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const parsed = bookingPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
    }
    const { reservationId, status, confirmChoiceIndex, adminMessage } = parsed.data;

    const db = getAdminDb();
    const docRef = db.collection('reservations').doc(reservationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservation = { id: doc.id, ...doc.data() } as Reservation;

    if (!canManageStore(user, reservation.storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Get store info for emails
    const store = await getV3StoreById(reservation.storeId);
    const locationName = store?.store_name || '';
    const locationPhone = store?.tel || '';
    const locationAddress = store?.address || '';
    const settings = await getStoreSettings(reservation.storeId);

    // Confirming a specific choice
    if (status === 'confirmed' && confirmChoiceIndex !== undefined) {
      const choice = reservation.choices?.[confirmChoiceIndex];
      if (!choice) {
        return NextResponse.json({ error: 'Invalid confirmChoiceIndex' }, { status: 400 });
      }

      updateData.confirmedChoice = confirmChoiceIndex;
      updateData.date = choice.date;
      updateData.time = choice.time;

      // Create Google Calendar event
      if (settings.calendarId) {
        const calEvent = await createCalendarEvent({
          calendarId: settings.calendarId,
          date: choice.date,
          time: choice.time,
          customerName: reservation.name,
          customerPhone: reservation.phone,
          customerEmail: reservation.email,
          locationName,
          type: reservation.type,
        });
        if (calEvent) {
          updateData.googleCalendarEventId = calEvent.eventId;
          updateData.googleCalendarId = settings.calendarId;
        }
      }

      // Send confirmation email to customer
      await sendConfirmationEmail({
        customerEmail: reservation.email,
        customerName: reservation.name,
        choices: reservation.choices,
        date: choice.date,
        time: choice.time,
        locationName,
        locationPhone,
        locationAddress,
        type: reservation.type,
        reservationId,
        isConfirmed: true,
        adminMessage,
      }).catch(err => console.error('Confirmation email failed:', err));
    }

    // Cancelling
    if (status === 'cancelled') {
      // Delete calendar event if exists
      if (reservation.googleCalendarId && reservation.googleCalendarEventId) {
        await deleteCalendarEvent(reservation.googleCalendarId, reservation.googleCalendarEventId)
          .catch(err => console.error('Calendar event deletion failed:', err));
        updateData.googleCalendarEventId = null;
        updateData.googleCalendarId = null;
      }

      // Send cancellation emails
      const emailPromises: Promise<void>[] = [];

      emailPromises.push(
        sendCancellationConfirmationEmail({
          customerEmail: reservation.email,
          customerName: reservation.name,
          date: reservation.date,
          time: reservation.time,
          locationName,
          locationPhone,
        })
      );

      if (settings.notificationEmails.length > 0) {
        emailPromises.push(
          sendCancellationNotificationEmail({
            staffEmail: settings.notificationEmails,
            customerName: reservation.name,
            date: reservation.date,
            time: reservation.time,
            locationName,
          })
        );
      }

      await Promise.allSettled(emailPromises);
    }

    await docRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
