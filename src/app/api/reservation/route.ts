import { NextResponse } from 'next/server';
import { createReservation } from '@/lib/reservations';
import { systemAlerts } from '@/lib/system-alerts-instance';
import { sendConfirmationEmail, sendStaffNotificationEmail } from '@/lib/email';
import { getV3StoreById } from '@/lib/firebase-stores';
import { getStoreSettings } from '@/lib/store-settings';
import { createCalendarEvent } from '@/lib/google-calendar';
import { getAdminDb } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { upsertCustomer } from '@/lib/customers';
import { reservationRequestSchema } from '@/lib/validations';
import { captureSecurityEvent, detectSuspiciousPatterns } from '@/lib/sentry-security';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`reservation:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let _storeIdForAlert = 'unknown';

  try {
    const body = await request.json().catch(() => null);
    const parsed = reservationRequestSchema.safeParse(body);

    if (!parsed.success) {
      const suspicious = detectSuspiciousPatterns(body);
      captureSecurityEvent({
        request,
        type: 'VALIDATION_ERROR',
        level: 'warning',
        message: 'Reservation validation failed',
        extra: { issues: parsed.error.issues, suspicious },
      });
      const first = parsed.error.issues[0];
      const fieldPath = first?.path?.join('.') ?? '';
      const safeMessage = fieldPath ? `${fieldPath}: ${first.message}` : (first?.message ?? 'Invalid request');
      return NextResponse.json({ error: safeMessage }, { status: 400 });
    }

    const {
      type,
      storeId,
      name,
      phone,
      email,
      notes,
      date,
      time,
      autoConfirm,
      vehicleInfo,
      selectedCoatings,
      selectedOptions,
    } = parsed.data;

    if (storeId && typeof storeId === 'string') _storeIdForAlert = storeId;

    // Create the reservation (auto-confirmed by default)
    const shouldConfirm = autoConfirm !== false && type === 'visit';
    const reservationCreated = await createReservation({
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
    const { id: reservationId, cancelToken } = reservationCreated;

    // Upsert customer record (best-effort — failure must not fail this request)
    try {
      await upsertCustomer({
        storeId,
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        source: 'booking',
      });
    } catch (customerErr) {
      console.error(`[reservation ${reservationId}] customer upsert failed:`, customerErr);
    }

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
          date: date || '',
          time: time || '',
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
    try {
      await systemAlerts.recordAlert({
        source: 'reservation',
        severity: 'error',
        title: 'Reservation write failed',
        payload: { error: String(error), storeId: _storeIdForAlert },
        dedupeKey: `reservation:write:${_storeIdForAlert}`,
      });
    } catch { /* never let alert recording corrupt the response */ }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
