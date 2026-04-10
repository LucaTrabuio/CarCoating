import { randomUUID } from 'crypto';
import { getAdminDb } from './firebase-admin';
import type { ReservationChoice } from './reservation-types';

export interface CreateReservationInput {
  type: 'visit' | 'inquiry';
  storeId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  autoConfirm?: boolean;
  vehicleInfo?: string;
  selectedCoatings?: string[];
  selectedOptions?: string[];
  // Legacy support: if choices is provided, use first one
  choices?: ReservationChoice[];
}

export interface CreateReservationResult {
  id: string;
  cancelToken: string;
}

export async function createReservation(input: CreateReservationInput): Promise<CreateReservationResult> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const cancelToken = randomUUID();

  // Support both single date/time and legacy choices array
  const date = input.date || input.choices?.[0]?.date || '';
  const time = input.time || input.choices?.[0]?.time || '';
  const choices: ReservationChoice[] = input.choices || [{ date, time }];

  const data = {
    type: input.type,
    storeId: input.storeId,
    choices,
    date,
    time,
    confirmedChoice: input.autoConfirm ? 0 : undefined,
    name: input.name,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
    vehicleInfo: input.vehicleInfo || null,
    selectedCoatings: input.selectedCoatings || [],
    selectedOptions: input.selectedOptions || [],
    status: input.autoConfirm ? 'confirmed' : 'pending',
    cancelToken,
    googleCalendarEventId: null,
    googleCalendarId: null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('reservations').add(data);
  return { id: docRef.id, cancelToken };
}
