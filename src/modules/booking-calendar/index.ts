// Booking Calendar Module — barrel exports

// Types
export type {
  SlotCapacity,
  WeeklyTemplate,
  DateOverride,
  ReservationChoice,
  Reservation,
  StoreSettings,
  SlotAvailability,
  CalendarCell,
  CellStatus,
} from './types';

// Components
export { default as CalendarGrid } from './components/CalendarGrid';
export type { CalendarGridProps } from './components/CalendarGrid';

export { default as WeeklyTemplateEditor } from './components/WeeklyTemplateEditor';
export type { WeeklyTemplateEditorProps } from './components/WeeklyTemplateEditor';

export { default as DateOverrideEditor } from './components/DateOverrideEditor';
export type { DateOverrideEditorProps } from './components/DateOverrideEditor';

export { default as TimeSlotGrid } from './components/TimeSlotGrid';
export type { TimeSlotGridProps } from './components/TimeSlotGrid';

// Hooks
export { useBookingSettings } from './hooks/useBookingSettings';
export type { UseBookingSettingsReturn } from './hooks/useBookingSettings';

// Lib — server-side only (requires Firebase)
export {
  getAvailableSlots,
  getAvailableDates,
  preloadSlotData,
  computeSlotsFromPreloaded,
  DEFAULT_SLOTS,
} from './lib/slots';
export type { PreloadedData } from './lib/slots';

// Lib — Japanese holidays (pure functions, works anywhere)
export { getJapaneseHolidays, getMonthHolidays } from './lib/jp-holidays';
