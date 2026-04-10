'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface Inquiry {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleInfo?: string;
  selectedTier?: string;
  message: string;
  status: 'open' | 'replied' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface Store {
  store_id: string;
  store_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: '未対応', color: 'bg-amber-100 text-amber-800' },
  replied: { label: '返信済み', color: 'bg-green-100 text-green-800' },
  closed: { label: '完了', color: 'bg-gray-100 text-gray-600' },
};

export default function InquiriesPage() {
  const user = useAdminAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('open');

  useEffect(() => {
    fetch('/api/v3/stores?all=true').then(r => r.json())
      .then(data => setStores(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inquiries', { cache: 'no-store' });
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch { setInquiries([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach(s => m.set(s.store_id, s.store_name));
    return m;
  }, [stores]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return inquiries;
    return inquiries.filter(i => i.status === statusFilter);
  }, [inquiries, statusFilter]);

  const selected = inquiries.find(i => i.id === selectedId) ?? null;

  const filterCounts = useMemo(() => {
    const c: Record<string, number> = { all: inquiries.length, open: 0, replied: 0, closed: 0 };
    inquiries.forEach(i => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [inquiries]);

  async function changeStatus(id: string, status: string) {
    await fetch('/api/admin/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId: id, status }),
    });
    fetchInquiries();
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">お問い合わせ管理</h1>

      {/* Filter chips */}
      <div className="flex gap-2">
        {([['all', 'すべて'], ['open', '未対応'], ['replied', '返信済み'], ['closed', '完了']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
              statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label} ({filterCounts[key] || 0})
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        {/* List */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-2">
          {loading && <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>}
          {!loading && filtered.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">お問い合わせがありません</div>
          )}
          {filtered.map(inq => {
            const isSelected = selectedId === inq.id;
            const sc = STATUS_CONFIG[inq.status] || STATUS_CONFIG.open;
            return (
              <button key={inq.id} type="button"
                onClick={() => setSelectedId(inq.id)}
                className={`w-full text-left bg-white border rounded-xl p-4 cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-400 border-2' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                  <span className="text-[10px] text-gray-400">{inq.createdAt?.slice(0, 10)}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{storeNameById.get(inq.storeId) || inq.storeId}</span>
                </div>
                <div className="text-sm font-bold text-[#0f1c2e]">{inq.customerName}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{inq.message}</div>
                {inq.selectedTier && (
                  <div className="text-[10px] text-blue-600 mt-1">検討コース: {inq.selectedTier}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          {!selected && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm min-h-[300px] flex items-center justify-center">
              お問い合わせを選択してください
            </div>
          )}
          {selected && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0f1c2e]">{selected.customerName}</h2>
                  <div className="text-xs text-gray-400 mt-0.5">{selected.createdAt?.slice(0, 16).replace('T', ' ')}</div>
                </div>
                <select value={selected.status}
                  onChange={e => changeStatus(selected.id, e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="open">未対応</option>
                  <option value="replied">返信済み</option>
                  <option value="closed">完了</option>
                </select>
              </div>

              <div className="space-y-1.5 text-xs">
                <div><span className="text-gray-400 w-16 inline-block">店舗</span><span className="text-gray-700">{storeNameById.get(selected.storeId) || selected.storeId}</span></div>
                <div><span className="text-gray-400 w-16 inline-block">電話</span><a href={`tel:${selected.customerPhone}`} className="text-blue-600">{selected.customerPhone || '—'}</a></div>
                <div><span className="text-gray-400 w-16 inline-block">メール</span><a href={`mailto:${selected.customerEmail}`} className="text-blue-600">{selected.customerEmail}</a></div>
                {selected.vehicleInfo && (
                  <div><span className="text-gray-400 w-16 inline-block">車種</span><span className="text-gray-700">{selected.vehicleInfo}</span></div>
                )}
                {selected.selectedTier && (
                  <div><span className="text-gray-400 w-16 inline-block">コース</span><span className="text-blue-700 font-bold">{selected.selectedTier}</span></div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-[10px] text-blue-600 font-bold mb-1">お問い合わせ内容</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
              </div>

              <p className="text-[10px] text-gray-400">
                店舗に送信された通知メールの「返信」ボタンから、お客様に直接返信できます。
                返信後は上のステータスを「返信済み」に変更してください。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
