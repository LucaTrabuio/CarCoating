import { NextResponse } from 'next/server';
import { createReservation } from '@/lib/reservations';
import { sendConfirmationEmail, sendStaffNotificationEmail } from '@/lib/email';
import { getV3StoreById } from '@/lib/firebase-stores';
import { getStoreSettings } from '@/lib/store-settings';
import type { ReservationChoice } from '@/lib/reservation-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, storeId, name, phone, email, notes, choices } = body;

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

    // Validate choices for visit type
    if (type === 'visit') {
      if (!Array.isArray(choices) || choices.length !== 3) {
        return NextResponse.json({ error: 'visit type requires exactly 3 date/time choices' }, { status: 400 });
      }
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const timeRe = /^\d{2}:\d{2}$/;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const choice of choices) {
        if (!choice.date || !choice.time) {
          return NextResponse.json({ error: 'Each choice must have date and time' }, { status: 400 });
        }
        if (!dateRe.test(choice.date) || !timeRe.test(choice.time)) {
          return NextResponse.json({ error: 'Invalid date or time format' }, { status: 400 });
        }
        const parsed = new Date(`${choice.date}T${choice.time}:00+09:00`);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'Invalid date or time value' }, { status: 400 });
        }
        if (parsed < today) {
          return NextResponse.json({ error: 'Choice dates must be in the future' }, { status: 400 });
        }
      }
    }

    const validChoices: ReservationChoice[] = type === 'visit'
      ? choices.map((c: { date: string; time: string }) => ({ date: c.date, time: c.time }))
      : [];

    // Create the reservation
    const { id: reservationId, cancelToken } = await createReservation({
      type,
      storeId,
      choices: validChoices,
      name,
      phone,
      email,
      notes: notes || '',
    });

    // Get store info for emails
    const store = await getV3StoreById(storeId);
    const locationName = store?.store_name || '';
    const locationPhone = store?.tel || '';
    const locationAddress = store?.address || '';

    // Get notification emails
    const settings = await getStoreSettings(storeId);

    // Fire emails (non-blocking)
    const emailPromises: Promise<void>[] = [];

    emailPromises.push(
      sendConfirmationEmail({
        customerEmail: email,
        customerName: name,
        choices: validChoices,
        date: validChoices[0]?.date || '',
        time: validChoices[0]?.time || '',
        locationName,
        locationPhone,
        locationAddress,
        type,
        reservationId,
        cancelToken,
      })
    );

    if (settings.notificationEmails.length > 0) {
      emailPromises.push(
        sendStaffNotificationEmail({
          staffEmail: settings.notificationEmails,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          choices: validChoices,
          date: validChoices[0]?.date || '',
          time: validChoices[0]?.time || '',
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
