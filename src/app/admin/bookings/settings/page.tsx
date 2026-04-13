'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import type { WeeklyTemplate, SlotCapacity, DateOverride } from '@/lib/reservation-types';
import { getMonthHolidays } from '@/lib/jp-holidays';

interface Store {
  store_id: string;
  store_name: string;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

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

type TabId = 'weekly' | 'calendar';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookingSettingsPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [template, setTemplate] = useState<Record<string, WeeklyTemplate>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedDay, setSavedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('weekly');

  // Calendar tab state
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [overrides, setOverrides] = useState<Record<string, DateOverride>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editOverride, setEditOverride] = useState<DateOverride | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd, setBulkEnd] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  // Load stores
  useEffect(() => {
    fetch('/api/v3/stores?all=true')
      .then(r => r.json())
      .then(data => {
        let list: Store[] = Array.isArray(data) ? data : [];
        if (user.role === 'store_admin') {
          list = list.filter(s => user.managed_stores.includes(s.store_id));
        }
        setStores(list);
        if (list.length === 1) setSelectedStore(list[0].store_id);
      })
      .catch(() => {});
  }, [user]);

  // Load template for selected store
  const loadTemplate = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/template?store=${storeId}`);
      const data = await res.json();
      const loaded: Record<string, WeeklyTemplate> = data.template || {};
      // Fill in missing days with empty templates
      const full: Record<string, WeeklyTemplate> = {};
      for (let d = 0; d < 7; d++) {
        full[String(d)] = loaded[String(d)] || emptyTemplate();
      }
      setTemplate(full);
    } catch {
      // Use empty templates
      const full: Record<string, WeeklyTemplate> = {};
      for (let d = 0; d < 7; d++) full[String(d)] = emptyTemplate();
      setTemplate(full);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedStore) loadTemplate(selectedStore);
  }, [selectedStore, loadTemplate]);

  async function saveDay(dayOfWeek: string) {
    if (!selectedStore) return;
    setSaving(dayOfWeek);
    try {
      const res = await fetch('/api/admin/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
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
  }

  function toggleClosed(dayOfWeek: string) {
    setTemplate(prev => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], closed: !prev[dayOfWeek].closed },
    }));
  }

  function setCapacity(dayOfWeek: string, time: string, capacity: number) {
    setTemplate(prev => {
      const day = prev[dayOfWeek];
      const newSlots = { ...day.slots };
      if (capacity <= 0) {
        delete newSlots[time];
      } else {
        newSlots[time] = { capacity };
      }
      return { ...prev, [dayOfWeek]: { ...day, slots: newSlots } };
    });
  }

  function addSlot(dayOfWeek: string) {
    const time = prompt('時刻を入力 (例: 18:00)');
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return;
    setCapacity(dayOfWeek, time, 2);
  }

  function copyFrom(toDayOfWeek: string, fromDayOfWeek: string) {
    setTemplate(prev => ({
      ...prev,
      [toDayOfWeek]: { ...prev[fromDayOfWeek] },
    }));
  }

  // ── Calendar tab: load overrides ──
  const loadOverrides = useCallback(async () => {
    if (!selectedStore) return;
    const monthStr = `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/admin/overrides?store=${selectedStore}&month=${monthStr}`);
      const data = await res.json();
      setOverrides(data.overrides || {});
    } catch {
      setOverrides({});
    }
  }, [selectedStore, calMonth]);

  useEffect(() => {
    if (activeTab === 'calendar') loadOverrides();
  }, [activeTab, loadOverrides]);

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const { year, month } = calMonth;
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);
    const startWeekday = firstOfMonth.getDay();
    const totalDays = lastOfMonth.getDate();
    const today = ymd(new Date());
    const cells: { date: string; inMonth: boolean; isToday: boolean; dayOfWeek: number }[] = [];

    const prevLast = new Date(year, month - 1, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 2, prevLast - i);
      cells.push({ date: ymd(d), inMonth: false, isToday: ymd(d) === today, dayOfWeek: d.getDay() });
    }
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month - 1, day);
      const dateStr = ymd(d);
      cells.push({ date: dateStr, inMonth: true, isToday: dateStr === today, dayOfWeek: d.getDay() });
    }
    let nextDay = 1;
    while (cells.length < 42) {
      const d = new Date(year, month, nextDay++);
      cells.push({ date: ymd(d), inMonth: false, isToday: false, dayOfWeek: d.getDay() });
    }
    return cells;
  }, [calMonth]);

  const holidays = useMemo(
    () => getMonthHolidays(calMonth.year, calMonth.month),
    [calMonth.year, calMonth.month]
  );

  function selectCalendarDate(date: string) {
    setSelectedDate(date);
    const existing = overrides[date];
    if (existing) {
      setEditOverride({ ...existing });
    } else {
      // Pre-populate from weekly template for that day of week
      const d = new Date(date + 'T00:00:00');
      const dayTpl = template[String(d.getDay())] || emptyTemplate();
      setEditOverride({ closed: false, slotOverrides: { ...dayTpl.slots } });
    }
  }

  async function saveOverride() {
    if (!selectedStore || !selectedDate || !editOverride) return;
    setSavingOverride(true);
    try {
      await fetch('/api/admin/overrides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore, date: selectedDate, override: editOverride }),
      });
      loadOverrides();
    } catch { alert('保存に失敗しました'); }
    setSavingOverride(false);
  }

  async function deleteOverride() {
    if (!selectedStore || !selectedDate) return;
    try {
      await fetch(`/api/admin/overrides?store=${selectedStore}&date=${selectedDate}`, { method: 'DELETE' });
      setSelectedDate(null);
      setEditOverride(null);
      loadOverrides();
    } catch { alert('削除に失敗しました'); }
  }

  async function bulkClose() {
    if (!selectedStore || !bulkStart || !bulkEnd) return;
    const start = new Date(bulkStart + 'T00:00:00');
    const end = new Date(bulkEnd + 'T00:00:00');
    if (start > end) { alert('開始日は終了日以前にしてください'); return; }
    const dates: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(ymd(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (!confirm(`${dates.length}日間を休業にしますか？`)) return;
    for (const date of dates) {
      await fetch('/api/admin/overrides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore, date, override: { closed: true, slotOverrides: {} } }),
      });
    }
    setShowBulk(false);
    setBulkStart('');
    setBulkEnd('');
    loadOverrides();
  }

  function setOverrideCapacity(time: string, capacity: number) {
    if (!editOverride) return;
    const newSlots = { ...editOverride.slotOverrides };
    if (capacity <= 0) delete newSlots[time];
    else newSlots[time] = { capacity };
    setEditOverride({ ...editOverride, slotOverrides: newSlots });
  }

  function getCellStatus(cell: { date: string; dayOfWeek: number }): {
    status: string;
    holiday?: string;
    isTemplateOff: boolean;
  } {
    const holiday = holidays.get(cell.date);
    const ov = overrides[cell.date];
    const tpl = template[String(cell.dayOfWeek)];
    const isTemplateOff = tpl?.closed === true;

    if (ov) {
      return { status: ov.closed ? 'closed-override' : 'override', holiday, isTemplateOff };
    }
    if (isTemplateOff) {
      return { status: 'closed-template', holiday, isTemplateOff };
    }
    if (holiday) {
      return { status: 'holiday', holiday, isTemplateOff };
    }
    return { status: 'open', holiday, isTemplateOff };
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">予約時間枠設定</h1>
          <p className="text-xs text-gray-500 mt-1">曜日ごとに受付時間と同時予約数を設定できます</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings/settings/store"
            className="text-xs text-amber-600 hover:text-amber-700 border border-amber-300 rounded px-3 py-2 hover:bg-amber-50"
          >
            📧 通知メール設定
          </Link>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">店舗を選択</option>
            {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
          </select>
        </div>
      </div>

      {!selectedStore && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          店舗を選択してください
        </div>
      )}

      {/* Tabs */}
      {selectedStore && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${activeTab === 'weekly' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            週間テンプレート
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${activeTab === 'calendar' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            日別カレンダー
          </button>
        </div>
      )}

      {selectedStore && loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>
      )}

      {/* ── Weekly template tab ── */}
      {selectedStore && !loading && activeTab === 'weekly' && [0, 1, 2, 3, 4, 5, 6].map(dayNum => {
        const day = String(dayNum);
        const tpl = template[day];
        if (!tpl) return null;
        const sortedTimes = Object.keys(tpl.slots).sort();

        return (
          <div key={day} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg ${dayNum === 0 ? 'text-red-500' : dayNum === 6 ? 'text-blue-500' : 'text-[#0C3290]'}`}>
                  {DAY_LABELS[dayNum]}曜日
                </span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tpl.closed}
                    onChange={() => toggleClosed(day)}
                    className="rounded"
                  />
                  定休日
                </label>
              </div>
              <div className="flex items-center gap-2">
                {dayNum > 0 && !tpl.closed && (
                  <select
                    onChange={e => { if (e.target.value) copyFrom(day, e.target.value); e.target.value = ''; }}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">他の曜日からコピー</option>
                    {[0, 1, 2, 3, 4, 5, 6].filter(d => d !== dayNum).map(d => (
                      <option key={d} value={String(d)}>{DAY_LABELS[d]}曜日から</option>
                    ))}
                  </select>
                )}
                {savedDay === day && <span className="text-xs text-green-600 font-semibold">✓ 保存しました</span>}
                <button
                  onClick={() => saveDay(day)}
                  disabled={saving === day}
                  className="px-4 py-1.5 bg-amber-500 text-[#0C3290] text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
                >
                  {saving === day ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

            {!tpl.closed && (
              <>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
                  {sortedTimes.map(time => (
                    <div key={time} className="border border-gray-200 rounded p-2 text-center">
                      <div className="text-xs font-bold text-[#0C3290] mb-1">{time}</div>
                      <input
                        type="number"
                        min={0}
                        value={tpl.slots[time].capacity}
                        onChange={e => setCapacity(day, time, parseInt(e.target.value) || 0)}
                        className="w-full text-center border border-gray-200 rounded text-xs py-0.5"
                      />
                      <div className="text-[9px] text-gray-400 mt-0.5">枠数</div>
                    </div>
                  ))}
                  <button
                    onClick={() => addSlot(day)}
                    className="border-2 border-dashed border-gray-300 rounded p-2 text-xs text-gray-400 hover:border-amber-400 hover:text-amber-500 cursor-pointer"
                  >
                    + 追加
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">枠数 = 同時に予約できる台数。0にすると時間帯が削除されます。</p>
              </>
            )}
          </div>
        );
      })}

      {/* ── Calendar tab ── */}
      {selectedStore && !loading && activeTab === 'calendar' && (
        <div className="flex gap-4 flex-wrap lg:flex-nowrap">
          {/* Calendar grid */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 w-full lg:w-[420px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCalMonth(m => ({ ...m, month: m.month - 1 < 1 ? 12 : m.month - 1, year: m.month - 1 < 1 ? m.year - 1 : m.year }))}
                className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">‹</button>
              <span className="font-bold text-sm text-gray-800">{calMonth.year}年{calMonth.month}月</span>
              <button onClick={() => setCalMonth(m => ({ ...m, month: m.month + 1 > 12 ? 1 : m.month + 1, year: m.month + 1 > 12 ? m.year + 1 : m.year }))}
                className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">›</button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-gray-400 font-bold mb-0.5">
              {DAY_LABELS.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarGrid.map((cell, i) => {
                const info = cell.inMonth ? getCellStatus(cell) : { status: 'out', holiday: undefined, isTemplateOff: false };
                const isSelected = cell.date === selectedDate;
                const bgColor: Record<string, string> = {
                  'out': 'bg-gray-50 text-gray-300',
                  'open': 'bg-white hover:border-gray-300',
                  'holiday': 'bg-pink-50 hover:border-pink-300',
                  'closed-template': 'bg-red-50 text-red-400',
                  'closed-override': 'bg-red-100 text-red-600',
                  'override': 'bg-amber-50 border-amber-200',
                };
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => cell.inMonth && selectCalendarDate(cell.date)}
                    disabled={!cell.inMonth}
                    title={info.holiday || (info.isTemplateOff ? '定休日（テンプレート）' : undefined)}
                    className={`relative aspect-square border rounded text-[10px] cursor-pointer transition-colors flex flex-col items-center justify-center ${
                      isSelected ? 'ring-2 ring-amber-400' : ''
                    } ${bgColor[info.status] || 'bg-white'} ${cell.inMonth ? 'border-gray-100' : 'border-transparent'}`}
                  >
                    <div className={`${cell.isToday ? 'font-bold text-amber-700' : ''} ${info.holiday && info.status !== 'closed-override' && info.status !== 'closed-template' ? 'text-pink-600' : ''} ${cell.dayOfWeek === 0 ? 'text-red-400' : cell.dayOfWeek === 6 ? 'text-blue-400' : ''}`}>
                      {parseInt(cell.date.split('-')[2], 10)}
                    </div>
                    {/* Indicator dots */}
                    <div className="flex gap-0.5 mt-0.5">
                      {cell.inMonth && overrides[cell.date] && (
                        <span className={`w-1.5 h-1.5 rounded-full ${overrides[cell.date].closed ? 'bg-red-500' : 'bg-amber-500'}`} />
                      )}
                      {cell.inMonth && info.holiday && !overrides[cell.date] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      )}
                      {cell.inMonth && info.isTemplateOff && !overrides[cell.date] && !info.holiday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[9px] text-gray-500 justify-center">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-gray-200" />通常</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-100 border border-pink-200" />祝日</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-50 border border-red-200" />定休日</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-200" />休業（個別）</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-200" />変更あり</span>
            </div>

            {/* Bulk close */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              {!showBulk ? (
                <button onClick={() => setShowBulk(true)}
                  className="w-full text-xs text-gray-500 hover:text-amber-600 cursor-pointer py-1">
                  一括休業設定
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-700">一括休業設定</div>
                  <div className="flex gap-2">
                    <input type="date" value={bulkStart} onChange={e => setBulkStart(e.target.value)} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                    <span className="text-xs text-gray-400 self-center">〜</span>
                    <input type="date" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={bulkClose} disabled={!bulkStart || !bulkEnd}
                      className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 disabled:opacity-50 cursor-pointer">
                      休業にする
                    </button>
                    <button onClick={() => { setShowBulk(false); setBulkStart(''); setBulkEnd(''); }}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="flex-1 min-w-0">
            {!selectedDate && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm min-h-[300px] flex items-center justify-center">
                カレンダーから日付を選択してください
              </div>
            )}

            {selectedDate && editOverride && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{selectedDate}</h3>
                    {holidays.get(selectedDate) && (
                      <span className="text-[10px] text-pink-600 font-bold">{holidays.get(selectedDate)}</span>
                    )}
                    {template[String(new Date(selectedDate + 'T00:00:00').getDay())]?.closed && !overrides[selectedDate] && (
                      <span className="text-[10px] text-red-400 font-bold ml-2">定休日（テンプレート）</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {overrides[selectedDate] && (
                      <button onClick={deleteOverride} className="text-[10px] text-red-500 hover:text-red-700 underline cursor-pointer">
                        テンプレートに戻す
                      </button>
                    )}
                    <button onClick={saveOverride} disabled={savingOverride}
                      className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer">
                      {savingOverride ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editOverride.closed}
                    onChange={e => setEditOverride({ ...editOverride, closed: e.target.checked })}
                    className="rounded"
                  />
                  この日を休業にする
                </label>

                {!editOverride.closed && (
                  <>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {Object.keys(editOverride.slotOverrides || {}).sort().map(time => (
                        <div key={time} className="border border-gray-200 rounded p-2 text-center">
                          <div className="text-xs font-bold text-[#0f1c2e] mb-1">{time}</div>
                          <input
                            type="number"
                            min={0}
                            value={editOverride.slotOverrides?.[time]?.capacity ?? 0}
                            onChange={e => setOverrideCapacity(time, parseInt(e.target.value) || 0)}
                            className="w-full text-center border border-gray-200 rounded text-xs py-0.5"
                          />
                          <div className="text-[9px] text-gray-400 mt-0.5">枠数</div>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const time = prompt('時刻を入力 (例: 18:00)');
                          if (time && /^\d{2}:\d{2}$/.test(time)) setOverrideCapacity(time, 2);
                        }}
                        className="border-2 border-dashed border-gray-300 rounded p-2 text-xs text-gray-400 hover:border-amber-400 hover:text-amber-500 cursor-pointer"
                      >
                        + 追加
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      この日のみの枠数を設定できます。「テンプレートに戻す」で週間テンプレートの設定に戻ります。
                    </p>
                  </>
                )}

                {!overrides[selectedDate] && (
                  <p className="text-[10px] text-amber-600">
                    この日にはまだ個別設定がありません。保存すると週間テンプレートより優先されます。
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
