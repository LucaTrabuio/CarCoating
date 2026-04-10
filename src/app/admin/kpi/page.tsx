'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

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
  page_views: number;
  cta_booking_clicks: number;
  cta_inquiry_clicks: number;
  line_clicks: number;
  quiz_completions: number;
  plan_selections: number;
}

interface StoreGroup {
  id: string;
  label: string;
  storeIds: string[];
  type: 'group' | 'standalone';
}

export default function KpiPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('__all__');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [rawEntries, setRawEntries] = useState<KpiEntry[]>([]); // per-store, ungrouped
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('bookings');
  const [sortAsc, setSortAsc] = useState(false);

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

  // Build hierarchy groups (memoized to avoid infinite re-render loop)
  const groups: StoreGroup[] = useMemo(() => {
    const result: StoreGroup[] = [];
    const grouped = new Set<string>();

    // "All stores" aggregate — visible store IDs depend on role
    const visibleStores = user.role === 'store_admin'
      ? stores.filter(s => user.managed_stores.includes(s.store_id))
      : stores;

    if (visibleStores.length > 0) {
      result.push({
        id: '__all__',
        label: user.role === 'super_admin'
          ? `すべての店舗（${visibleStores.length}）`
          : `すべての担当店舗（${visibleStores.length}）`,
        storeIds: visibleStores.map(s => s.store_id),
        type: 'group',
      });
    }

    for (const sc of subCompanies) {
      const memberIds = (sc.stores || []).filter(id =>
        user.role === 'super_admin' || user.managed_stores.includes(id)
      );
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

    for (const s of visibleStores) {
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
  }, [stores, subCompanies, user]);

  const selectedGroupData = useMemo(
    () => groups.find(g => g.id === selectedGroup),
    [groups, selectedGroup],
  );

  const fetchKpi = useCallback(async (signal: AbortSignal) => {
    if (!selectedGroupData) return;
    setLoading(true);
    setError(null);
    try {
      const allEntries: KpiEntry[] = [];
      const storeIds = selectedGroupData.storeIds;
      const BATCH_SIZE = 5;
      const TIMEOUT_MS = 15000;

      for (let i = 0; i < storeIds.length; i += BATCH_SIZE) {
        if (signal.aborted) return;
        const batch = storeIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (storeId) => {
            const params = new URLSearchParams({ storeId, startDate, endDate });
            const res = await fetch(`/api/admin/kpi?${params}`, {
              signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
            });
            if (!res.ok) throw new Error(`Store ${storeId}: ${res.status}`);
            const data = await res.json();
            return data.records ?? data.entries ?? data ?? [];
          })
        );
        for (const list of results) {
          if (Array.isArray(list)) allEntries.push(...list);
        }
      }

      if (signal.aborted) return;

      // Aggregate by date
      const byDate = new Map<string, KpiEntry>();
      const numFields = ['phone_calls', 'inquiries', 'bookings', 'page_views', 'cta_booking_clicks', 'cta_inquiry_clicks', 'line_clicks', 'quiz_completions', 'plan_selections'] as const;
      for (const e of allEntries) {
        const existing = byDate.get(e.date);
        if (existing) {
          for (const f of numFields) existing[f] += ((e as unknown as Record<string, number>)[f] || 0);
        } else {
          const entry = { date: e.date, store_id: 'aggregate' } as KpiEntry;
          for (const f of numFields) entry[f] = ((e as unknown as Record<string, number>)[f] || 0);
          byDate.set(e.date, entry);
        }
      }

      const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      setEntries(sorted);
      setRawEntries(allEntries);
    } catch (err) {
      if (signal.aborted) return;
      const msg = err instanceof Error ? err.message : '不明なエラー';
      setError(msg.includes('TimeoutError') || msg.includes('timeout')
        ? 'リクエストがタイムアウトしました。後でもう一度お試しください。'
        : `KPIの取得に失敗しました: ${msg}`);
      setEntries([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [selectedGroupData, startDate, endDate]);

  useEffect(() => {
    if (!selectedGroupData) {
      setEntries([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    fetchKpi(controller.signal);
    return () => controller.abort();
  }, [selectedGroup, startDate, endDate, fetchKpi, selectedGroupData]);

  const totals = entries.reduce(
    (acc, e) => {
      acc.phone_calls += (e.phone_calls || 0);
      acc.inquiries += (e.inquiries || 0);
      acc.bookings += (e.bookings || 0);
      acc.page_views += (e.page_views || 0);
      acc.cta_booking_clicks += (e.cta_booking_clicks || 0);
      acc.cta_inquiry_clicks += (e.cta_inquiry_clicks || 0);
      acc.line_clicks += (e.line_clicks || 0);
      acc.quiz_completions += (e.quiz_completions || 0);
      acc.plan_selections += (e.plan_selections || 0);
      return acc;
    },
    { phone_calls: 0, inquiries: 0, bookings: 0, page_views: 0, cta_booking_clicks: 0, cta_inquiry_clicks: 0, line_clicks: 0, quiz_completions: 0, plan_selections: 0 },
  );

  // Per-store totals for breakdown table
  const perStoreTotals = useMemo(() => {
    if (!selectedGroupData || selectedGroupData.storeIds.length <= 1) return [];
    const numFields = ['phone_calls', 'inquiries', 'bookings', 'page_views', 'cta_booking_clicks', 'cta_inquiry_clicks', 'line_clicks', 'quiz_completions', 'plan_selections'] as const;
    const map = new Map<string, Record<string, number>>();
    for (const e of rawEntries) {
      const sid = (e as unknown as Record<string, string>).storeId || e.store_id;
      if (!sid || sid === 'aggregate') continue;
      const row = map.get(sid) || Object.fromEntries(numFields.map(f => [f, 0]));
      for (const f of numFields) row[f] = (row[f] || 0) + ((e as unknown as Record<string, number>)[f] || 0);
      map.set(sid, row);
    }
    const result = [...map.entries()].map(([storeId, data]) => {
      const s = stores.find(st => st.store_id === storeId);
      return { storeId, storeName: s?.store_name || storeId, ...data };
    });
    // Sort
    result.sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[sortField] || 0;
      const bv = (b as unknown as Record<string, number>)[sortField] || 0;
      return sortAsc ? av - bv : bv - av;
    });
    return result;
  }, [rawEntries, selectedGroupData, stores, sortField, sortAsc]);

  const conversionRate = totals.page_views > 0 ? ((totals.bookings / totals.page_views) * 100).toFixed(1) : '—';

  // SVG chart data (PV + bookings lines)
  const chartData = useMemo(() => {
    if (entries.length < 2) return null;
    const maxPv = Math.max(1, ...entries.map(e => e.page_views || 0));
    const maxBookings = Math.max(1, ...entries.map(e => e.bookings || 0));
    const w = 600;
    const h = 150;
    const pad = 20;
    const xStep = (w - pad * 2) / (entries.length - 1);
    const pvPoints = entries.map((e, i) => `${pad + i * xStep},${h - pad - ((e.page_views || 0) / maxPv) * (h - pad * 2)}`).join(' ');
    const bookingPoints = entries.map((e, i) => `${pad + i * xStep},${h - pad - ((e.bookings || 0) / maxBookings) * (h - pad * 2)}`).join(' ');
    return { pvPoints, bookingPoints, w, h, pad, maxPv, maxBookings, xStep };
  }, [entries]);

  function toggleSort(field: string) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

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
              {groups.filter(g => g.id === '__all__').map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
              {groups.filter(g => g.type === 'group' && g.id !== '__all__').length > 0 && (
                <optgroup label="グループ（共有サイト）">
                  {groups.filter(g => g.type === 'group' && g.id !== '__all__').map(g => (
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
          <p className="text-xs text-amber-500 mt-1">
            {selectedGroupData.storeIds.map(id => {
              const s = stores.find(st => st.store_id === id);
              return s?.store_name || id;
            }).join('、')}
          </p>
        </div>
      )}

      {/* Stat cards */}
      {selectedGroupData && !loading && entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'ページビュー', value: totals.page_views, color: 'text-slate-700' },
            { label: '電話クリック', value: totals.phone_calls, color: 'text-blue-700' },
            { label: '予約数', value: totals.bookings, color: 'text-green-700' },
            { label: 'CVR', value: conversionRate + '%', color: 'text-amber-700' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[10px] text-gray-500 font-bold">{card.label}</div>
              <div className={`text-2xl font-bold tabular-nums mt-1 ${card.color}`}>{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* SVG trend chart */}
      {selectedGroupData && !loading && chartData && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-sm font-bold text-gray-900">トレンド</h2>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400 inline-block" />PV</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" />予約</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${chartData.w} ${chartData.h}`} className="w-full h-auto" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(pct => (
              <line key={pct} x1={chartData.pad} y1={chartData.h - chartData.pad - pct * (chartData.h - chartData.pad * 2)} x2={chartData.w - chartData.pad} y2={chartData.h - chartData.pad - pct * (chartData.h - chartData.pad * 2)} stroke="#e5e7eb" strokeWidth={0.5} />
            ))}
            <polyline points={chartData.pvPoints} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
            <polyline points={chartData.bookingPoints} fill="none" stroke="#22c55e" strokeWidth={2} />
          </svg>
          <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-5">
            <span>{entries[0]?.date?.slice(5)}</span>
            <span>{entries[Math.floor(entries.length / 2)]?.date?.slice(5)}</span>
            <span>{entries[entries.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}

      {/* KPI Table */}
      {selectedGroupData && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">日別データ</h2>
            <button
              onClick={handleExportCsv}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              CSV出力
            </button>
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => { const c = new AbortController(); fetchKpi(c.signal); }}
                className="mt-2 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
              >
                再試行
              </button>
            </div>
          ) : loading ? (
            <p className="text-sm text-gray-500">読み込み中...（{selectedGroupData.storeIds.length}店舗）</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500">データがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                    <th className="pb-2 pr-3 sticky left-0 bg-white">日付</th>
                    <th className="pb-2 px-2 text-right">PV</th>
                    <th className="pb-2 px-2 text-right">電話</th>
                    <th className="pb-2 px-2 text-right">問合せ</th>
                    <th className="pb-2 px-2 text-right">予約</th>
                    <th className="pb-2 px-2 text-right">予約CTA</th>
                    <th className="pb-2 px-2 text-right">問合CTA</th>
                    <th className="pb-2 px-2 text-right">LINE</th>
                    <th className="pb-2 px-2 text-right">診断</th>
                    <th className="pb-2 px-2 text-right">プラン選択</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((e, i) => (
                    <tr key={e.id ?? i}>
                      <td className="py-2 pr-3 text-gray-700 sticky left-0 bg-white">{e.date}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-400">{e.page_views || 0}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-700">{e.phone_calls}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-700">{e.inquiries}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-700">{e.bookings}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-400">{e.cta_booking_clicks || 0}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-400">{e.cta_inquiry_clicks || 0}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-400">{e.line_clicks || 0}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-400">{e.quiz_completions || 0}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-gray-400">{e.plan_selections || 0}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-medium">
                    <td className="py-2 pr-3 text-gray-900 sticky left-0 bg-white">合計</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500">{totals.page_views}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-900">{totals.phone_calls}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-900">{totals.inquiries}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-900">{totals.bookings}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500">{totals.cta_booking_clicks}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500">{totals.cta_inquiry_clicks}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500">{totals.line_clicks}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500">{totals.quiz_completions}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-500">{totals.plan_selections}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Per-store breakdown */}
      {perStoreTotals.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">店舗別内訳</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-3 sticky left-0 bg-white">店舗名</th>
                  {[
                    { key: 'page_views', label: 'PV' },
                    { key: 'phone_calls', label: '電話' },
                    { key: 'inquiries', label: '問合せ' },
                    { key: 'bookings', label: '予約' },
                    { key: 'line_clicks', label: 'LINE' },
                  ].map(col => (
                    <th key={col.key}
                      className="pb-2 px-2 text-right cursor-pointer hover:text-amber-600 select-none"
                      onClick={() => toggleSort(col.key)}>
                      {col.label} {sortField === col.key ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perStoreTotals.map(row => (
                  <tr key={row.storeId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedGroup(row.storeId)}>
                    <td className="py-2 pr-3 text-gray-700 sticky left-0 bg-white font-medium text-xs">{row.storeName}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-400">{(row as unknown as Record<string, number>).page_views || 0}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-700">{(row as unknown as Record<string, number>).phone_calls || 0}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-700">{(row as unknown as Record<string, number>).inquiries || 0}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-700 font-bold">{(row as unknown as Record<string, number>).bookings || 0}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-400">{(row as unknown as Record<string, number>).line_clicks || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">店舗名をクリックすると、その店舗の個別KPIを表示します</p>
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
