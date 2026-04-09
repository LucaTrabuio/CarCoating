'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import type { WeeklyTemplate, SlotCapacity } from '@/lib/reservation-types';

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

export default function BookingSettingsPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [template, setTemplate] = useState<Record<string, WeeklyTemplate>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedDay, setSavedDay] = useState<string | null>(null);

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

      {selectedStore && loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>
      )}

      {selectedStore && !loading && [0, 1, 2, 3, 4, 5, 6].map(dayNum => {
        const day = String(dayNum);
        const tpl = template[day];
        if (!tpl) return null;
        const sortedTimes = Object.keys(tpl.slots).sort();

        return (
          <div key={day} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg ${dayNum === 0 ? 'text-red-500' : dayNum === 6 ? 'text-blue-500' : 'text-[#0f1c2e]'}`}>
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
                  className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
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
                      <div className="text-xs font-bold text-[#0f1c2e] mb-1">{time}</div>
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
    </div>
  );
}
