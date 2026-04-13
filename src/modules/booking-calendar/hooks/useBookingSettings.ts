'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WeeklyTemplate, DateOverride, SlotCapacity } from '../types';

// Default time slots (9:00 - 17:30, 30min intervals, no 12:00-12:30 lunch)
const DEFAULT_SLOT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

function emptyTemplate(): WeeklyTemplate {
  const slots: Record<string, SlotCapacity> = {};
  for (const t of DEFAULT_SLOT_TIMES) {
    slots[t] = { capacity: 2 };
  }
  return { closed: false, slots };
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface UseBookingSettingsReturn {
  template: Record<string, WeeklyTemplate>;
  setTemplate: React.Dispatch<React.SetStateAction<Record<string, WeeklyTemplate>>>;
  overrides: Record<string, DateOverride>;
  calMonth: { year: number; month: number };
  setCalMonth: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
  loading: boolean;
  saving: string | null;
  savedDay: string | null;
  savingOverride: boolean;
  saveDay: (dayOfWeek: string) => Promise<void>;
  loadOverrides: () => Promise<void>;
  saveOverride: (date: string, override: DateOverride) => Promise<void>;
  deleteOverride: (date: string) => Promise<void>;
  bulkClose: (startDate: string, endDate: string) => Promise<void>;
}

/**
 * Hook that wraps all admin booking settings data and operations.
 *
 * @param storeId - The store to manage settings for
 * @param apiBasePath - Base path for API endpoints (default: '/api/admin')
 */
export function useBookingSettings(
  storeId: string,
  apiBasePath: string = '/api/admin',
): UseBookingSettingsReturn {
  const [template, setTemplate] = useState<Record<string, WeeklyTemplate>>({});
  const [overrides, setOverrides] = useState<Record<string, DateOverride>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedDay, setSavedDay] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  // Load template for selected store
  const loadTemplate = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/template?store=${storeId}`);
      const data = await res.json();
      const loaded: Record<string, WeeklyTemplate> = data.template || {};
      const full: Record<string, WeeklyTemplate> = {};
      for (let d = 0; d < 7; d++) {
        full[String(d)] = loaded[String(d)] || emptyTemplate();
      }
      setTemplate(full);
    } catch {
      const full: Record<string, WeeklyTemplate> = {};
      for (let d = 0; d < 7; d++) full[String(d)] = emptyTemplate();
      setTemplate(full);
    }
    setLoading(false);
  }, [storeId, apiBasePath]);

  useEffect(() => {
    if (storeId) loadTemplate();
  }, [storeId, loadTemplate]);

  // Save a single day's template
  const saveDay = useCallback(async (dayOfWeek: string) => {
    if (!storeId) return;
    setSaving(dayOfWeek);
    try {
      const res = await fetch(`${apiBasePath}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          dayOfWeek,
          template: template[dayOfWeek],
        }),
      });
      if (!res.ok) throw new Error();
      setSavedDay(dayOfWeek);
      setTimeout(() => setSavedDay(null), 2000);
    } catch {
      alert('保存に失敗しました');
    }
    setSaving(null);
  }, [storeId, apiBasePath, template]);

  // Load overrides for the current calendar month
  const loadOverrides = useCallback(async () => {
    if (!storeId) return;
    const monthStr = `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}`;
    try {
      const res = await fetch(`${apiBasePath}/overrides?store=${storeId}&month=${monthStr}`);
      const data = await res.json();
      setOverrides(data.overrides || {});
    } catch {
      setOverrides({});
    }
  }, [storeId, apiBasePath, calMonth]);

  // Save override for a specific date
  const saveOverride = useCallback(async (date: string, override: DateOverride) => {
    if (!storeId) return;
    setSavingOverride(true);
    try {
      await fetch(`${apiBasePath}/overrides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, date, override }),
      });
      await loadOverrides();
    } catch {
      alert('保存に失敗しました');
    }
    setSavingOverride(false);
  }, [storeId, apiBasePath, loadOverrides]);

  // Delete an override (revert to template)
  const deleteOverride = useCallback(async (date: string) => {
    if (!storeId) return;
    try {
      await fetch(`${apiBasePath}/overrides?store=${storeId}&date=${date}`, { method: 'DELETE' });
      await loadOverrides();
    } catch {
      alert('削除に失敗しました');
    }
  }, [storeId, apiBasePath, loadOverrides]);

  // Bulk close a date range
  const bulkClose = useCallback(async (startDate: string, endDate: string) => {
    if (!storeId) return;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (start > end) {
      alert('開始日は終了日以前にしてください');
      return;
    }
    const dates: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(ymd(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (!confirm(`${dates.length}日間を休業にしますか？`)) return;
    for (const date of dates) {
      await fetch(`${apiBasePath}/overrides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, date, override: { closed: true, slotOverrides: {} } }),
      });
    }
    await loadOverrides();
  }, [storeId, apiBasePath, loadOverrides]);

  return {
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
  };
}
