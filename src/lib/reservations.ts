import { getAdminDb } from './firebase-admin';
import type { ReservationChoice } from './reservation-types';

export interface CreateReservationInput {
  type: 'visit' | 'inquiry';
  storeId: string;
  choices: ReservationChoice[];
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export async function createReservation(input: CreateReservationInput): Promise<string> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const data = {
    type: input.type,
    storeId: input.storeId,
    choices: input.choices,
    date: input.choices[0]?.date || '',
    time: input.choices[0]?.time || '',
    name: input.name,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    status: 'pending',
    googleCalendarEventId: null,
    googleCalendarId: null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('reservations').add(data);
  return docRef.id;
}
