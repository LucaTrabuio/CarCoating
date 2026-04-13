# Booking Calendar Module

Reusable booking calendar components, hooks, and server-side slot computation extracted from the car-coating admin interface.

## Overview

This module provides everything needed to manage store booking schedules:

- **Weekly templates** — set default open/closed status and slot capacities per day of week
- **Date overrides** — override capacity or close specific dates
- **Calendar grid** — visual month calendar with color-coded status indicators
- **Slot computation** — server-side functions that compute available time slots from templates, overrides, and existing reservations
- **Japanese holidays** — automatic detection of national holidays (祝日)

## Required Firestore Collections

```
shops/{storeId}/weeklyTemplate/{dayOfWeek}   → WeeklyTemplate
shops/{storeId}/dateOverrides/{YYYY-MM-DD}   → DateOverride
reservations                                  → Reservation (filtered by storeId)
```

### `weeklyTemplate` document shape

```ts
{
  closed: boolean;
  slots: {
    "09:00": { capacity: 2 },
    "09:30": { capacity: 2 },
    // ...
  }
}
```

Document IDs: `"0"` (Sunday) through `"6"` (Saturday).

### `dateOverrides` document shape

```ts
{
  closed: boolean;
  slotOverrides: {
    "09:00": { capacity: 1 },
    // ...
  }
}
```

Document IDs: `"YYYY-MM-DD"` format.

### `reservations` collection

Documents must have `storeId`, `status` (`'pending'` | `'confirmed'`), `date`, `time`, and `choices` fields. See `types.ts` for the full `Reservation` interface.

## Required API Endpoints

The `useBookingSettings` hook calls these endpoints (configurable via `apiBasePath`, default `/api/admin`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `{apiBasePath}/template?store={storeId}` | Load weekly templates |
| PUT | `{apiBasePath}/template` | Save a day's template (body: `{ storeId, dayOfWeek, template }`) |
| GET | `{apiBasePath}/overrides?store={storeId}&month={YYYY-MM}` | Load month overrides |
| PUT | `{apiBasePath}/overrides` | Save date override (body: `{ storeId, date, override }`) |
| DELETE | `{apiBasePath}/overrides?store={storeId}&date={YYYY-MM-DD}` | Delete override |

For public slot availability:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/slots?store={storeId}&date={YYYY-MM-DD}` | Available slots for a date |

## Usage

### Import components and hooks

```tsx
import {
  CalendarGrid,
  WeeklyTemplateEditor,
  DateOverrideEditor,
  TimeSlotGrid,
  useBookingSettings,
  getMonthHolidays,
} from '@/modules/booking-calendar';
```

### Using the hook

```tsx
const {
  template,
  setTemplate,
  overrides,
  calMonth,
  setCalMonth,
  loading,
  saving,
  savedDay,
  savingOverride,
  saveDay,
  loadOverrides,
  saveOverride,
  deleteOverride,
  bulkClose,
} = useBookingSettings(storeId, '/api/admin');
```

### CalendarGrid

```tsx
<CalendarGrid
  year={calMonth.year}
  month={calMonth.month}
  onPrevMonth={() => setCalMonth(m => ({ ...m, month: m.month - 1 < 1 ? 12 : m.month - 1, year: m.month - 1 < 1 ? m.year - 1 : m.year }))}
  onNextMonth={() => setCalMonth(m => ({ ...m, month: m.month + 1 > 12 ? 1 : m.month + 1, year: m.month + 1 > 12 ? m.year + 1 : m.year }))}
  selectedDate={selectedDate}
  onSelectDate={setSelectedDate}
  holidays={getMonthHolidays(calMonth.year, calMonth.month)}
  overrides={overrides}
  templateByDay={template}
/>
```

### WeeklyTemplateEditor

```tsx
<WeeklyTemplateEditor
  template={template}
  onSave={(day, tpl) => saveDay(day)}
  saving={saving}
  savedDay={savedDay}
  onTemplateChange={setTemplate}
/>
```

### DateOverrideEditor

```tsx
<DateOverrideEditor
  date={selectedDate}
  override={editOverride}
  holidays={holidays}
  templateForDay={template[String(new Date(selectedDate + 'T00:00:00').getDay())]}
  onSave={(override) => saveOverride(selectedDate, override)}
  onDelete={() => deleteOverride(selectedDate)}
  saving={savingOverride}
  hasExistingOverride={!!overrides[selectedDate]}
  onOverrideChange={setEditOverride}
/>
```

### TimeSlotGrid (standalone)

```tsx
<TimeSlotGrid
  slots={mySlots}
  onChange={(time, capacity) => { /* update slot */ }}
  onAddSlot={() => { /* prompt for time, add slot */ }}
/>
```

### Server-side slot computation

```ts
import { getAvailableSlots, getAvailableDates } from '@/modules/booking-calendar';

// Single date
const slots = await getAvailableSlots(storeId, '2026-04-15');

// All available dates in a month (batch-optimized, ~3 Firestore queries)
const dates = await getAvailableDates(storeId, 2026, 4);
```

## Google Calendar Integration

This module works alongside `src/lib/google-calendar.ts` for syncing confirmed reservations to Google Calendar. The integration is handled at the API layer — when a reservation is confirmed, the API creates a Google Calendar event using the store's configured `calendarId` (stored in Firestore as `StoreSettings`).

The module itself does not directly call Google Calendar APIs, but the `Reservation` type includes `googleCalendarEventId` and `googleCalendarId` fields for tracking synced events.

## Japanese Holiday Support

The `jp-holidays.ts` module calculates all Japanese national holidays for any year:

- **Fixed holidays**: New Year's Day, National Foundation Day, Emperor's Birthday, etc.
- **Happy Monday holidays**: Coming of Age Day, Marine Day, Respect for the Aged Day, Sports Day
- **Equinox holidays**: Vernal Equinox, Autumnal Equinox (calculated astronomically)
- **Substitute holidays** (振替休日): when a holiday falls on Sunday
- **Citizen's holidays** (国民の休日): days sandwiched between two holidays

```ts
import { getJapaneseHolidays, getMonthHolidays } from '@/modules/booking-calendar';

const allHolidays = getJapaneseHolidays(2026); // Map<"YYYY-MM-DD", holidayName>
const aprilHolidays = getMonthHolidays(2026, 4);
```

## Color Coding (Calendar)

| Color | Meaning |
|-------|---------|
| White | Open (normal) |
| Pink | National holiday |
| Light red | Closed (from weekly template) |
| Dark red | Closed (date override) |
| Amber | Has date override (open with modified slots) |
