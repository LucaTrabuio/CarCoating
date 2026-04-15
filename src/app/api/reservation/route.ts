import { NextResponse } from 'next/server';
import { createReservation } from '@/lib/reservations';
import { sendConfirmationEmail, sendStaffNotificationEmail } from '@/lib/email';
import { getV3StoreById } from '@/lib/firebase-stores';
import { getStoreSettings } from '@/lib/store-settings';
import { createCalendarEvent } from '@/lib/google-calendar';
import { getAdminDb } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`reservation:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { type, storeId, name, phone, email, notes, date, time, autoConfirm,
            vehicleInfo, selectedCoatings, selectedOptions } = body;

    // Validate required fields
    if (!type || !['visit', 'inquiry'].includes(type)) {
      return NextResponse.json({ error: 'type must be "visit" or "inquiry"' }, { status: 400 });
    }
    if (!storeId || typeof storeId !== 'string' || !storeId.trim()) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate single date/time for visit type
    if (type === 'visit') {
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const timeRe = /^\d{2}:\d{2}$/;
      if (!date || !dateRe.test(date)) {
        return NextResponse.json({ error: 'valid date is required (YYYY-MM-DD)' }, { status: 400 });
      }
      if (!time || !timeRe.test(time)) {
        return NextResponse.json({ error: 'valid time is required (HH:MM)' }, { status: 400 });
      }
      const parsed = new Date(`${date}T${time}:00+09:00`);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid date or time value' }, { status: 400 });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) {
        return NextResponse.json({ error: 'Booking must be in the future' }, { status: 400 });
      }
    }

    // Create the reservation (auto-confirmed by default)
    const shouldConfirm = autoConfirm !== false && type === 'visit';
    const { id: reservationId, cancelToken } = await createReservation({
      type,
      storeId,
      date: date || '',
      time: time || '',
      name,
      phone,
      email,
      notes: notes || '',
      autoConfirm: shouldConfirm,
      vehicleInfo: typeof vehicleInfo === 'string' ? vehicleInfo : undefined,
      selectedCoatings: Array.isArray(selectedCoatings) ? selectedCoatings : undefined,
      selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : undefined,
    });

    // Get store info for emails
    const store = await getV3StoreById(storeId);
    const locationName = store?.store_name || '';
    const locationPhone = store?.tel || '';
    const locationAddress = store?.address || '';

    // Get notification emails and calendar settings
    const settings = await getStoreSettings(storeId);

    // Create Google Calendar event if auto-confirmed
    if (shouldConfirm && settings.calendarId) {
      try {
        const result = await createCalendarEvent({
          calendarId: settings.calendarId,
          title: `【来店予約】${name} 様`,
          date,
          time,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          locationName,
          type,
        });
        if (result?.eventId) {
          await getAdminDb().collection('reservations').doc(reservationId).update({
            googleCalendarEventId: result.eventId,
            googleCalendarId: settings.calendarId,
          });
        }
      } catch (err) {
        console.error('Calendar event creation failed:', err);
      }
    }

    // Fire emails (non-blocking)
    const emailPromises: Promise<void>[] = [];

    emailPromises.push(
      sendConfirmationEmail({
        customerEmail: email,
        customerName: name,
        choices: [{ date: date || '', time: time || '' }],
        date: date || '',
        time: time || '',
        locationName,
        locationPhone,
        locationAddress,
        type,
        reservationId,
        cancelToken,
        isConfirmed: shouldConfirm,
      })
    );

    if (settings.notificationEmails.length > 0) {
      emailPromises.push(
        sendStaffNotificationEmail({
          staffEmail: settings.notificationEmails,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          choices: [{ date: date || '', time: time || '' }],
          date: date || '',
          time: time || '',
          locationName,
          type,
          notes: notes || '',
        })
      );
    }

    const emailResults = await Promise.allSettled(emailPromises);
    emailResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[reservation ${reservationId}] email ${i} failed:`, result.reason);
      }
    });

    return NextResponse.json({ id: reservationId });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
