// Module version available at @/modules/booking-calendar/types

export interface SlotCapacity {
  capacity: number;
}

export interface WeeklyTemplate {
  closed: boolean;
  slots: Record<string, SlotCapacity>; // e.g. { "09:00": { capacity: 2 } }
}

export interface DateOverride {
  closed: boolean;
  slotOverrides: Record<string, SlotCapacity>; // capacity 0 = blocked
}

export interface ReservationChoice {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
}

export interface Reservation {
  id?: string;
  type: 'visit' | 'inquiry';
  storeId: string;
  choices: ReservationChoice[];
  confirmedChoice?: number;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  cancelToken?: string;
  googleCalendarEventId?: string | null;
  googleCalendarId?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StoreSettings {
  calendarId: string;
  notificationEmails: string[];
  updatedAt?: string;
}

export interface SlotAvailability {
  time: string;
  remaining: number;
}
