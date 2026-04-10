'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface Reservation {
  id: string;
  type: string;
  storeId: string;
  choices: { date: string; time: string }[];
  confirmedChoice?: number;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  vehicleInfo?: string;
  selectedCoatings?: string[];
  selectedOptions?: string[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

interface Store {
  store_id: string;
  store_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '受付済み', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: '確定', color: 'bg-green-100 text-green-800' },
  completed: { label: '完了', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
};

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayYmd(): string {
  return ymd(new Date());
}

function formatDate(date: string, time?: string) {
  const d = new Date(date + 'T00:00:00+09:00');
  const day = DAY_LABELS[d.getDay()];
  return time ? `${date}（${day}）${time}` : `${date}（${day}）`;
}

export default function BookingsPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

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
      })
      .catch(() => {});
  }, [user]);

  // Load bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedStore === 'all'
        ? '/api/admin/bookings'
        : `/api/admin/bookings?store=${selectedStore}`;
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      let data: { reservations?: Reservation[]; bookings?: Reservation[]; error?: string } = {};
      try { data = JSON.parse(text); } catch { /* keep text for debug */ }
      const list = data.reservations || data.bookings || [];
      setBookings(list);
      setDebugInfo(`HTTP ${res.status} · url=${url} · items=${list.length}${data.error ? ' · error=' + data.error : ''}${!Array.isArray(data.reservations) && !Array.isArray(data.bookings) ? ' · raw=' + text.slice(0, 200) : ''}`);
      // eslint-disable-next-line no-console
      console.log('[bookings]', { url, status: res.status, data });
    } catch (err) {
      setBookings([]);
      setDebugInfo(`fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  }, [selectedStore]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Map of reservations by date (excluding cancelled for the dot count)
  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      if (!b.date) continue;
      const list = map.get(b.date) || [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [bookings]);

  // Sorted list (always shows ALL — no filtering by day)
  const sortedBookings = useMemo(() => {
    const today = todayYmd();
    return [...bookings].sort((a, b) => {
      const aActive = a.status !== 'cancelled' && a.status !== 'completed';
      const bActive = b.status !== 'cancelled' && b.status !== 'completed';
      const aUpcoming = aActive && a.date >= today;
      const bUpcoming = bActive && b.date >= today;
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      const aKey = `${a.date || '9999-12-31'} ${a.time || '00:00'}`;
      const bKey = `${b.date || '9999-12-31'} ${b.time || '00:00'}`;
      if (aUpcoming && bUpcoming) return aKey.localeCompare(bKey);
      return bKey.localeCompare(aKey);
    });
  }, [bookings]);

  // Reservations for the selected day (for the detail panel)
  const selectedDayReservations = useMemo(() => {
    if (!selectedDay) return [];
    return bookings
      .filter(b => b.date === selectedDay)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [selectedDay, bookings]);

  // Detail panel target: a specific reservation (if user clicked one), otherwise the day's list
  const focusedReservation = useMemo(() => {
    if (!selectedReservationId) return null;
    return bookings.find(b => b.id === selectedReservationId) || null;
  }, [selectedReservationId, bookings]);

  // Calendar grid (6 weeks)
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstOfMonth.getDay();
    const totalDays = lastOfMonth.getDate();
    const today = todayYmd();
    const cells: { date: string; inMonth: boolean; isToday: boolean; count: number }[] = [];
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLast - i);
      const dateStr = ymd(d);
      cells.push({ date: dateStr, inMonth: false, isToday: dateStr === today, count: reservationsByDate.get(dateStr)?.length || 0 });
    }
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      const dateStr = ymd(d);
      cells.push({ date: dateStr, inMonth: true, isToday: dateStr === today, count: reservationsByDate.get(dateStr)?.length || 0 });
    }
    let nextDay = 1;
    while (cells.length < 42) {
      const d = new Date(year, month + 1, nextDay++);
      const dateStr = ymd(d);
      cells.push({ date: dateStr, inMonth: false, isToday: dateStr === today, count: reservationsByDate.get(dateStr)?.length || 0 });
    }
    return cells;
  }, [calendarMonth, reservationsByDate]);

  function prevMonth() {
    setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setCalendarMonth(d);
    setSelectedDay(todayYmd());
    setSelectedReservationId(null);
  }

  function selectDay(date: string) {
    setSelectedDay(prev => (prev === date ? null : date));
    setSelectedReservationId(null);
  }

  function selectReservation(b: Reservation) {
    setSelectedReservationId(b.id);
    setSelectedDay(b.date || null);
    if (b.date) {
      // Jump calendar to the reservation's month
      const d = new Date(b.date + 'T00:00:00');
      setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }

  async function confirmChoice(reservationId: string, choiceIndex: number) {
    setActionLoading(reservationId);
    try {
      await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status: 'confirmed', confirmChoiceIndex: choiceIndex }),
      });
      fetchBookings();
    } catch { alert('操作に失敗しました'); }
    setActionLoading(null);
  }

  async function cancelBooking(reservationId: string) {
    if (!confirm('この予約をキャンセルしますか？')) return;
    setActionLoading(reservationId);
    try {
      await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status: 'cancelled' }),
      });
      fetchBookings();
    } catch { alert('操作に失敗しました'); }
    setActionLoading(null);
  }

  async function completeBooking(reservationId: string) {
    setActionLoading(reservationId);
    try {
      await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, status: 'completed' }),
      });
      fetchBookings();
    } catch { alert('操作に失敗しました'); }
    setActionLoading(null);
  }

  const monthLabel = `${calendarMonth.getFullYear()}年${calendarMonth.getMonth() + 1}月`;

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach(s => m.set(s.store_id, s.store_name));
    return m;
  }, [stores]);

  const allStoresLabel = user.role === 'super_admin' ? 'すべての店舗' : 'すべての担当店舗';

  function renderReservationDetail(b: Reservation) {
    const isPending = b.status === 'pending';
    const showChoices = isPending && b.choices && b.choices.length > 1;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_CONFIG[b.status].color}`}>{STATUS_CONFIG[b.status].label}</span>
          <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">{storeNameById.get(b.storeId) || b.storeId}</span>
        </div>
        <div>
          <div className="text-lg font-bold text-[#0C3290]">{b.name}</div>
          {b.date && <div className="text-sm text-gray-600 mt-0.5">{formatDate(b.date, b.time)}</div>}
        </div>
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-gray-400 w-14 inline-block">電話</span>
            <a href={`tel:${b.phone}`} className="text-blue-600 hover:underline">{b.phone}</a>
          </div>
          <div>
            <span className="text-gray-400 w-14 inline-block">メール</span>
            <a href={`mailto:${b.email}`} className="text-blue-600 hover:underline break-all">{b.email}</a>
          </div>
          {b.type && (
            <div>
              <span className="text-gray-400 w-14 inline-block">種別</span>
              <span className="text-gray-700">{b.type === 'visit' ? '来店予約' : 'お問い合わせ'}</span>
            </div>
          )}
          {b.createdAt && (
            <div>
              <span className="text-gray-400 w-14 inline-block">受付日</span>
              <span className="text-gray-500">{b.createdAt.slice(0, 10)}</span>
            </div>
          )}
        </div>
        {b.vehicleInfo && (
          <div className="text-xs">
            <span className="text-gray-400 w-14 inline-block">車種</span>
            <span className="text-gray-700">{b.vehicleInfo}</span>
          </div>
        )}
        {b.selectedCoatings && b.selectedCoatings.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-400">コース: </span>
            <span className="text-gray-700">{b.selectedCoatings.join(', ')}</span>
          </div>
        )}
        {b.selectedOptions && b.selectedOptions.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-400">オプション: </span>
            <span className="text-gray-700">{b.selectedOptions.join(', ')}</span>
          </div>
        )}
        {b.notes && (
          <div className="text-xs">
            <div className="text-gray-400 mb-1">備考</div>
            <div className="text-gray-700 bg-gray-50 border border-gray-100 rounded p-2 whitespace-pre-wrap">{b.notes}</div>
          </div>
        )}
        {showChoices && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-gray-500">希望日時を確定:</div>
            {b.choices.map((c, i) => (
              <button key={i} onClick={() => confirmChoice(b.id, i)} disabled={actionLoading === b.id}
                className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg text-xs hover:border-green-400 hover:bg-green-50 cursor-pointer transition-colors disabled:opacity-50">
                第{i + 1}希望: {formatDate(c.date, c.time)}
                <span className="float-right text-green-600 font-bold">確定 →</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {b.status === 'confirmed' && (
            <button onClick={() => completeBooking(b.id)} disabled={actionLoading === b.id}
              className="flex-1 px-3 py-2 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer">完了にする</button>
          )}
          {(b.status === 'pending' || b.status === 'confirmed') && (
            <button onClick={() => cancelBooking(b.id)} disabled={actionLoading === b.id}
              className="flex-1 px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">キャンセル</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">予約管理</h1>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {user.role === 'super_admin' ? 'super_admin' : `store_admin (${user.managed_stores.length} stores)`} · 全 {bookings.length} 件取得
          </div>
          {debugInfo && (
            <div className="text-[10px] text-amber-600 mt-0.5 font-mono break-all">{debugInfo}</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings/settings"
            className="text-xs text-amber-600 hover:text-amber-700 border border-amber-300 rounded px-3 py-2 hover:bg-amber-50 transition-colors"
          >
            ⚙ 時間枠設定
          </Link>
          <select
            value={selectedStore}
            onChange={e => {
              setSelectedStore(e.target.value);
              setSelectedDay(null);
              setSelectedReservationId(null);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">{allStoresLabel}</option>
            {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
          </select>
        </div>
      </div>

      {/* Calendar + Detail panel side-by-side */}
      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        {/* Calendar */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 w-full lg:w-[360px] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">‹</button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-800">{monthLabel}</span>
              <button onClick={goToday} className="text-[10px] text-gray-500 underline cursor-pointer">今日</button>
            </div>
            <button onClick={nextMonth} className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-gray-400 font-bold mb-0.5">
            {DAY_LABELS.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarGrid.map((cell, i) => {
              const isSelected = cell.date === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell.date)}
                  className={`relative aspect-square border rounded text-[10px] cursor-pointer transition-colors flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-amber-50 border-amber-400'
                      : cell.inMonth
                        ? 'bg-white border-gray-100 hover:border-gray-300'
                        : 'bg-gray-50 border-gray-50'
                  }`}
                >
                  <div className={`${cell.isToday ? 'font-bold text-amber-700' : cell.inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                    {parseInt(cell.date.split('-')[2], 10)}
                  </div>
                  {cell.count > 0 && (
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 min-h-[280px]">
          {!selectedDay && !focusedReservation && (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center py-10">
              カレンダーの日付か、下の予約一覧から予約を選択してください
            </div>
          )}
          {focusedReservation && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-gray-500">予約詳細</div>
                <button
                  onClick={() => { setSelectedReservationId(null); }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline cursor-pointer"
                >
                  閉じる
                </button>
              </div>
              {renderReservationDetail(focusedReservation)}
            </div>
          )}
          {!focusedReservation && selectedDay && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-gray-500">{formatDate(selectedDay)} の予約 ({selectedDayReservations.length})</div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline cursor-pointer"
                >
                  閉じる
                </button>
              </div>
              {selectedDayReservations.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-10">この日の予約はありません</div>
              ) : selectedDayReservations.length === 1 ? (
                renderReservationDetail(selectedDayReservations[0])
              ) : (
                <div className="space-y-2">
                  {selectedDayReservations.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedReservationId(b.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status].color}`}>{STATUS_CONFIG[b.status].label}</span>
                        <span className="font-bold text-sm text-[#0C3290]">{b.name}</span>
                        <span className="text-xs text-gray-500">{b.time}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">{storeNameById.get(b.storeId) || b.storeId}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full bookings list — always shows ALL */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>
      )}

      {!loading && sortedBookings.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          予約がありません
        </div>
      )}

      {!loading && sortedBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700">予約一覧 (全{sortedBookings.length}件)</h2>
          {sortedBookings.map(b => {
            const isSelected = selectedReservationId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectReservation(b)}
                className={`w-full text-left bg-white rounded-xl p-4 border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 border-2 bg-amber-50/40'
                    : b.status === 'pending'
                      ? 'border-amber-200 border-2 hover:border-amber-300'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status].color}`}>{STATUS_CONFIG[b.status].label}</span>
                  <span className="font-bold text-sm text-[#0C3290]">{b.name}</span>
                  {b.date && (
                    <span className="text-xs text-gray-500">{formatDate(b.date, b.time)}</span>
                  )}
                  {selectedStore === 'all' && (
                    <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">{storeNameById.get(b.storeId) || b.storeId}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">{b.phone} / {b.email}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
