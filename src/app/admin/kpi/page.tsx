'use client';

import { useState, useEffect, useCallback } from 'react';

interface Store {
  store_id: string;
  store_name: string;
}

interface KpiEntry {
  id?: string;
  date: string;
  store_id: string;
  phone_calls: number;
  inquiries: number;
  bookings: number;
}

export default function KpiPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Add entry form
  const [form, setForm] = useState<KpiEntry>({
    date: new Date().toISOString().slice(0, 10),
    store_id: '',
    phone_calls: 0,
    inquiries: 0,
    bookings: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/v3/stores?all=true')
      .then((r) => r.json())
      .then((data) => setStores(data.stores ?? data ?? []))
      .catch(() => {});
  }, []);

  const fetchKpi = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        storeId: selectedStore,
        startDate,
        endDate,
      });
      const res = await fetch(`/api/admin/kpi?${params}`);
      const data = await res.json();
      setEntries(data.entries ?? data ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStore, startDate, endDate]);

  useEffect(() => {
    if (selectedStore) fetchKpi();
    else setEntries([]);
  }, [selectedStore, startDate, endDate, fetchKpi]);

  // Totals
  const totals = entries.reduce(
    (acc, e) => ({
      phone_calls: acc.phone_calls + e.phone_calls,
      inquiries: acc.inquiries + e.inquiries,
      bookings: acc.bookings + e.bookings,
    }),
    { phone_calls: 0, inquiries: 0, bookings: 0 },
  );

  async function handleAddEntry() {
    if (!form.store_id) {
      alert('店舗を選択してください');
      return;
    }
    setSaving(true);
    try {
      await fetch('/api/admin/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ ...form, phone_calls: 0, inquiries: 0, bookings: 0 });
      if (selectedStore) fetchKpi();
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    if (!selectedStore) return;
    const params = new URLSearchParams({
      storeId: selectedStore,
      startDate,
      endDate,
    });
    window.open(`/api/admin/kpi/export?${params}`, '_blank');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">KPIダッシュボード</h1>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">店舗</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- 店舗を選択 --</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>
                  {s.store_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* KPI Table */}
      {selectedStore && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">KPIデータ</h2>
            <button
              onClick={handleExportCsv}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              CSV出力
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500">データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2 pr-4">日付</th>
                    <th className="pb-2 pr-4 text-right">電話</th>
                    <th className="pb-2 pr-4 text-right">問い合わせ</th>
                    <th className="pb-2 text-right">予約</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e, i) => (
                    <tr key={e.id ?? i}>
                      <td className="py-2 pr-4 text-gray-700">{e.date}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-700">
                        {e.phone_calls}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-gray-700">
                        {e.inquiries}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-700">{e.bookings}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-300 font-medium">
                    <td className="py-2 pr-4 text-gray-900">合計</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-900">
                      {totals.phone_calls}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-900">
                      {totals.inquiries}
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-900">
                      {totals.bookings}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add entry form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">KPIエントリー追加</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm text-gray-700">日付</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">店舗</label>
            <select
              value={form.store_id}
              onChange={(e) => setForm({ ...form, store_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- 選択 --</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>
                  {s.store_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">電話</label>
            <input
              type="number"
              min={0}
              value={form.phone_calls}
              onChange={(e) => setForm({ ...form, phone_calls: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">問い合わせ</label>
            <input
              type="number"
              min={0}
              value={form.inquiries}
              onChange={(e) => setForm({ ...form, inquiries: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">予約</label>
            <input
              type="number"
              min={0}
              value={form.bookings}
              onChange={(e) => setForm({ ...form, bookings: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleAddEntry}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? '保存中...' : '追加'}
        </button>
      </div>
    </div>
  );
}
