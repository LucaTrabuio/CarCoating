import { getAdminDb } from './firebase-admin';
import type { WeeklyTemplate, DateOverride, SlotAvailability, SlotCapacity } from './reservation-types';

const DEFAULT_SLOTS: Record<string, SlotCapacity> = {
  '09:00': { capacity: 2 }, '09:30': { capacity: 2 },
  '10:00': { capacity: 2 }, '10:30': { capacity: 2 },
  '11:00': { capacity: 2 }, '11:30': { capacity: 2 },
  '13:00': { capacity: 2 }, '13:30': { capacity: 2 },
  '14:00': { capacity: 2 }, '14:30': { capacity: 2 },
  '15:00': { capacity: 2 }, '15:30': { capacity: 2 },
  '16:00': { capacity: 2 }, '16:30': { capacity: 2 },
  '17:00': { capacity: 1 }, '17:30': { capacity: 1 },
};

export async function getAvailableSlots(storeId: string, dateString: string): Promise<SlotAvailability[]> {
  const db = getAdminDb();
  const dateObj = new Date(dateString + 'T00:00:00+09:00');
  const dayOfWeek = dateObj.getDay().toString();

  // Load weekly template
  const templateDoc = await db.doc(`shops/${storeId}/weeklyTemplate/${dayOfWeek}`).get();
  const template: WeeklyTemplate = templateDoc.exists
    ? templateDoc.data() as WeeklyTemplate
    : { closed: false, slots: DEFAULT_SLOTS };

  if (template.closed) return [];

  // Load date override
  const overrideDoc = await db.doc(`shops/${storeId}/dateOverrides/${dateString}`).get();
  const override: DateOverride | null = overrideDoc.exists ? overrideDoc.data() as DateOverride : null;

  if (override?.closed) return [];

  // Merge template with override
  const mergedSlots = { ...template.slots };
  if (override?.slotOverrides) {
    for (const [time, cap] of Object.entries(override.slotOverrides)) {
      if (cap.capacity === 0) {
        delete mergedSlots[time];
      } else {
        mergedSlots[time] = cap;
      }
    }
  }

  // Count existing bookings for this date
  const bookingSnap = await db.collection('reservations')
    .where('storeId', '==', storeId)
    .where('status', 'in', ['pending', 'confirmed'])
    .get();

  const bookingCounts: Record<string, number> = {};
  for (const doc of bookingSnap.docs) {
    const data = doc.data();
    // Count confirmed bookings by their confirmed date/time
    if (data.status === 'confirmed' && data.date === dateString) {
      bookingCounts[data.time] = (bookingCounts[data.time] || 0) + 1;
    }
    // Count pending bookings by all their choice dates/times
    if (data.status === 'pending' && data.choices) {
      for (const choice of data.choices as { date: string; time: string }[]) {
        if (choice.date === dateString) {
          bookingCounts[choice.time] = (bookingCounts[choice.time] || 0) + 1;
        }
      }
    }
  }

  // Filter to past times if date is today
  const now = new Date();
  const isToday = dateString === now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Calculate remaining capacity
  const result: SlotAvailability[] = [];
  for (const [time, cap] of Object.entries(mergedSlots)) {
    if (isToday) {
      const [h, m] = time.split(':').map(Number);
      if (h * 60 + m <= currentMinutes) continue;
    }
    const booked = bookingCounts[time] || 0;
    const remaining = cap.capacity - booked;
    if (remaining > 0) {
      result.push({ time, remaining });
    }
  }

  return result.sort((a, b) => a.time.localeCompare(b.time));
}

export async function getAvailableDates(storeId: string, year: number, month: number): Promise<string[]> {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Skip past dates
    const dateObj = new Date(dateString + 'T23:59:59+09:00');
    if (dateObj < new Date()) continue;

    const slots = await getAvailableSlots(storeId, dateString);
    if (slots.length > 0) {
      dates.push(dateString);
    }
  }

  return dates;
}
