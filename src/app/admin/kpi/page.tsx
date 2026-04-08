'use client';

import { useState, useEffect, useCallback } from 'react';

interface Store {
  store_id: string;
  store_name: string;
  sub_company_id?: string;
}

interface SubCompany {
  id: string;
  name: string;
  slug: string;
  stores: string[];
}

interface KpiEntry {
  id?: string;
  date: string;
  store_id: string;
  phone_calls: number;
  inquiries: number;
  bookings: number;
}

interface StoreGroup {
  id: string;
  label: string;
  storeIds: string[];
  type: 'group' | 'standalone';
}

export default function KpiPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/v3/stores?all=true').then(r => r.json()),
      fetch('/api/v3/sub-companies').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([storeData, scData]) => {
      const storeList = storeData.stores ?? storeData ?? [];
      setStores(Array.isArray(storeList) ? storeList : []);
      setSubCompanies(Array.isArray(scData) ? scData : []);
    }).catch(() => {});
  }, []);

  // Build hierarchy groups
  const groups: StoreGroup[] = (() => {
    const result: StoreGroup[] = [];
    const grouped = new Set<string>();

    // Sub-company groups
    for (const sc of subCompanies) {
      const memberIds = sc.stores || [];
      if (memberIds.length > 0) {
        result.push({
          id: `sc:${sc.id}`,
          label: `${sc.name}（${memberIds.length}店舗）`,
          storeIds: memberIds,
          type: 'group',
        });
        memberIds.forEach(id => grouped.add(id));
      }
    }

    // Standalone stores
    for (const s of stores) {
      if (!grouped.has(s.store_id)) {
        result.push({
          id: s.store_id,
          label: s.store_name,
          storeIds: [s.store_id],
          type: 'standalone',
        });
      }
    }

    return result;
  })();

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  const fetchKpi = useCallback(async () => {
    if (!selectedGroupData) return;
    setLoading(true);
    try {
      // Fetch KPI for all stores in the group
      const allEntries: KpiEntry[] = [];
      await Promise.all(
        selectedGroupData.storeIds.map(async (storeId) => {
          const params = new URLSearchParams({ storeId, startDate, endDate });
          const res = await fetch(`/api/admin/kpi?${params}`);
          const data = await res.json();
          const list = data.records ?? data.entries ?? data ?? [];
          if (Array.isArray(list)) allEntries.push(...list);
        })
      );

      // Aggregate by date
      const byDate = new Map<string, KpiEntry>();
      for (const e of allEntries) {
        const existing = byDate.get(e.date);
        if (existing) {
          existing.phone_calls += (e.phone_calls || 0);
          existing.inquiries += (e.inquiries || 0);
          existing.bookings += (e.bookings || 0);
        } else {
          byDate.set(e.date, {
            date: e.date,
            store_id: 'aggregate',
            phone_calls: e.phone_calls || 0,
            inquiries: e.inquiries || 0,
            bookings: e.bookings || 0,
          });
        }
      }

      const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      setEntries(sorted);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupData, startDate, endDate]);

  useEffect(() => {
    if (selectedGroupData) fetchKpi();
    else setEntries([]);
  }, [selectedGroup, startDate, endDate, fetchKpi, selectedGroupData]);

  const totals = entries.reduce(
    (acc, e) => ({
      phone_calls: acc.phone_calls + (e.phone_calls || 0),
      inquiries: acc.inquiries + (e.inquiries || 0),
      bookings: acc.bookings + (e.bookings || 0),
    }),
    { phone_calls: 0, inquiries: 0, bookings: 0 },
  );

  function handleExportCsv() {
    if (!selectedGroupData) return;
    // Export first store for standalone, or first in group
    const params = new URLSearchParams({
      storeId: selectedGroupData.storeIds[0],
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
            <label className="mb-1 block text-sm font-medium text-gray-700">店舗 / グループ</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- 選択 --</option>
              {groups.filter(g => g.type === 'group').length > 0 && (
                <optgroup label="グループ（共有サイト）">
                  {groups.filter(g => g.type === 'group').map(g => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="個別店舗">
                {groups.filter(g => g.type === 'standalone').map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </optgroup>
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

      {/* Group info */}
      {selectedGroupData && selectedGroupData.type === 'group' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800 font-medium">
            グループ集計: {selectedGroupData.storeIds.length}店舗のKPIを合算表示
          </p>
          <p className="text-xs text-amber-600 mt-1">
            {selectedGroupData.storeIds.map(id => {
              const s = stores.find(st => st.store_id === id);
              return s?.store_name || id;
            }).join('、')}
          </p>
        </div>
      )}

      {/* KPI Table */}
      {selectedGroupData && (
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

      {/* Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs text-gray-500">
          KPIは自動で記録されます。電話リンクのクリック、お問い合わせフォーム送信、予約フォーム送信が自動的にカウントされます。
          グループに属する店舗はKPIが合算されます。
        </p>
      </div>
    </div>
  );
}
