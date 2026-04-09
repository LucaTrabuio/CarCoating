import { randomUUID } from 'crypto';
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

export interface CreateReservationResult {
  id: string;
  cancelToken: string;
}

export async function createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const cancelToken = randomUUID();

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
    cancelToken,
    googleCalendarEventId: null,
    googleCalendarId: null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('reservations').add(data);
  return { id: docRef.id, cancelToken };
}
