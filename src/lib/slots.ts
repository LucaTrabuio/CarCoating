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

/** Pre-loaded data to avoid repeated Firestore reads inside loops. */
interface PreloadedData {
  templates: Map<string, WeeklyTemplate>;           // dayOfWeek → template
  overrides: Map<string, DateOverride>;              // dateString → override
  bookingsByDate: Map<string, Record<string, number>>; // date → { time: count }
}

/**
 * Compute available slots for a single date using pre-loaded data.
 * No Firestore calls — pure computation.
 */
function computeSlotsFromPreloaded(
  dateString: string,
  preloaded: PreloadedData,
): SlotAvailability[] {
  const dateObj = new Date(dateString + 'T00:00:00+09:00');
  const dayOfWeek = dateObj.getDay().toString();

  const template = preloaded.templates.get(dayOfWeek) ?? { closed: false, slots: DEFAULT_SLOTS };
  if (template.closed) return [];

  const override = preloaded.overrides.get(dateString) ?? null;
  if (override?.closed) return [];

  // Merge template with override
  const mergedSlots = { ...template.slots };
  if (override?.slotOverrides) {
    for (const [time, cap] of Object.entries(override.slotOverrides)) {
      if (cap.capacity === 0) delete mergedSlots[time];
      else mergedSlots[time] = cap;
    }
  }

  const bookingCounts = preloaded.bookingsByDate.get(dateString) ?? {};

  // Filter past times if date is today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = dateString === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const result: SlotAvailability[] = [];
  for (const [time, cap] of Object.entries(mergedSlots)) {
    if (isToday) {
      const [h, m] = time.split(':').map(Number);
      if (h * 60 + m <= currentMinutes) continue;
    }
    const booked = bookingCounts[time] || 0;
    const remaining = cap.capacity - booked;
    if (remaining > 0) result.push({ time, remaining });
  }

  return result.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Batch-load all data needed to compute slots for any date range.
 * Result: ~3 Firestore queries total (templates, overrides, reservations).
 */
async function preloadSlotData(storeId: string, dateStrings?: string[]): Promise<PreloadedData> {
  const db = getAdminDb();

  // 1. Load all 7 weekly templates in one batch
  const templateMap = new Map<string, WeeklyTemplate>();
  const templateSnap = await db.collection(`shops/${storeId}/weeklyTemplate`).get();
  for (const doc of templateSnap.docs) {
    templateMap.set(doc.id, doc.data() as WeeklyTemplate);
  }

  // 2. Load date overrides — if we know the date range, use a where filter
  const overrideMap = new Map<string, DateOverride>();
  if (dateStrings && dateStrings.length > 0) {
    // Firestore 'in' limit is 30, which fits a single month
    const chunks: string[][] = [];
    for (let i = 0; i < dateStrings.length; i += 30) {
      chunks.push(dateStrings.slice(i, i + 30));
    }
    for (const chunk of chunks) {
      const snap = await db.collection(`shops/${storeId}/dateOverrides`)
        .where('__name__', 'in', chunk)
        .get();
      for (const doc of snap.docs) {
        overrideMap.set(doc.id, doc.data() as DateOverride);
      }
    }
  } else {
    const overrideSnap = await db.collection(`shops/${storeId}/dateOverrides`).get();
    for (const doc of overrideSnap.docs) {
      overrideMap.set(doc.id, doc.data() as DateOverride);
    }
  }

  // 3. Load ALL active reservations for the store (pending + confirmed) — ONE query
  const bookingSnap = await db.collection('reservations')
    .where('storeId', '==', storeId)
    .where('status', 'in', ['pending', 'confirmed'])
    .get();

  const bookingsByDate = new Map<string, Record<string, number>>();
  for (const doc of bookingSnap.docs) {
    const data = doc.data();
    if (data.status === 'confirmed' && data.date) {
      const counts = bookingsByDate.get(data.date) ?? {};
      counts[data.time] = (counts[data.time] || 0) + 1;
      bookingsByDate.set(data.date, counts);
    }
    if (data.status === 'pending' && data.choices) {
      for (const choice of data.choices as { date: string; time: string }[]) {
        const counts = bookingsByDate.get(choice.date) ?? {};
        counts[choice.time] = (counts[choice.time] || 0) + 1;
        bookingsByDate.set(choice.date, counts);
      }
    }
  }

  return { templates: templateMap, overrides: overrideMap, bookingsByDate };
}

/**
 * Get available time slots for a single date.
 * Makes 3 Firestore reads (template, override, reservations).
 * For bulk operations, use getAvailableDates which batch-loads.
 */
export async function getAvailableSlots(storeId: string, dateString: string): Promise<SlotAvailability[]> {
  const preloaded = await preloadSlotData(storeId, [dateString]);
  return computeSlotsFromPreloaded(dateString, preloaded);
}

/**
 * Get all dates in a month that have at least one available slot.
 * Batch-loads all data in ~3 Firestore queries, then computes in-memory.
 * Previously made 90+ sequential reads for a 30-day month.
 */
export async function getAvailableDates(storeId: string, year: number, month: number): Promise<string[]> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const dateStrings: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateString + 'T23:59:59+09:00');
    if (dateObj < now) continue;
    dateStrings.push(dateString);
  }

  if (dateStrings.length === 0) return [];

  // Batch-load everything in ~3 queries
  const preloaded = await preloadSlotData(storeId, dateStrings);

  // Compute availability per day in-memory (no Firestore calls)
  const available: string[] = [];
  for (const dateString of dateStrings) {
    const slots = computeSlotsFromPreloaded(dateString, preloaded);
    if (slots.length > 0) available.push(dateString);
  }

  return available;
}
