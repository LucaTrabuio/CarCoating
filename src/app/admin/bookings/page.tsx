'use client';

import { useState, useEffect, useCallback } from 'react';
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

function formatDate(date: string, time?: string) {
  const d = new Date(date + 'T00:00:00+09:00');
  const day = DAY_LABELS[d.getDay()];
  return time ? `${date}（${day}）${time}` : `${date}（${day}）`;
}

export default function BookingsPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // Load bookings
  const fetchBookings = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?store=${selectedStore}`);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      setBookings([]);
    }
    setLoading(false);
  }, [selectedStore]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

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

  const pending = bookings.filter(b => b.status === 'pending');
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">予約管理</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings/settings"
            className="text-xs text-amber-600 hover:text-amber-700 border border-amber-300 rounded px-3 py-2 hover:bg-amber-50 transition-colors"
          >
            ⚙ 時間枠設定
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

      {selectedStore && !loading && bookings.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">予約がありません</div>
      )}

      {/* Pending bookings */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-amber-700 mb-2">確認待ち ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(b => (
              <div key={b.id} className="bg-white border-2 border-amber-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status].color}`}>{STATUS_CONFIG[b.status].label}</span>
                    <span className="text-xs text-gray-400 ml-2">{b.createdAt?.slice(0, 10)}</span>
                  </div>
                  <button onClick={() => cancelBooking(b.id)} disabled={actionLoading === b.id}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer">キャンセル</button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-sm">
                    <div className="font-bold text-[#0f1c2e]">{b.name}</div>
                    <div className="text-xs text-gray-500">{b.phone} / {b.email}</div>
                    {b.notes && <div className="text-xs text-gray-400 mt-1">備考: {b.notes}</div>}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-500 mb-1">希望日時を確定:</div>
                    {b.choices?.map((c, i) => (
                      <button key={i} onClick={() => confirmChoice(b.id, i)} disabled={actionLoading === b.id}
                        className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg text-xs hover:border-green-400 hover:bg-green-50 cursor-pointer transition-colors disabled:opacity-50">
                        第{i + 1}希望: {formatDate(c.date, c.time)}
                        <span className="float-right text-green-600 font-bold">確定 →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed bookings */}
      {confirmed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-green-700 mb-2">確定済み ({confirmed.length})</h2>
          <div className="space-y-2">
            {confirmed.map(b => (
              <div key={b.id} className="bg-white border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status].color}`}>{STATUS_CONFIG[b.status].label}</span>
                  <span className="font-bold text-sm text-[#0f1c2e] ml-2">{b.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{formatDate(b.date, b.time)}</span>
                  <span className="text-xs text-gray-400 ml-2">{b.phone}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => completeBooking(b.id)} disabled={actionLoading === b.id}
                    className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer">完了</button>
                  <button onClick={() => cancelBooking(b.id)} disabled={actionLoading === b.id}
                    className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">キャンセル</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past bookings */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-2">過去 ({past.length})</h2>
          <div className="space-y-1">
            {past.map(b => (
              <div key={b.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center justify-between text-sm opacity-70">
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status].color}`}>{STATUS_CONFIG[b.status].label}</span>
                  <span className="text-gray-700 ml-2">{b.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{formatDate(b.date, b.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
