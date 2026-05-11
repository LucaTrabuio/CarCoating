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

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  open:    { label: '未対応',   badgeClass: 'badge warn' },
  replied: { label: '返信済み', badgeClass: 'badge ok' },
  closed:  { label: '完了',     badgeClass: 'badge' },
};

export default function InquiriesPage() {
  const user = useAdminAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('open');
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchInquiries sets state once data resolves; fetch-on-mount pattern
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

  async function sendReply(id: string) {
    if (!replyText.trim()) return;
    setReplying(true);
    await fetch('/api/admin/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId: id, status: 'replied', replyText }),
    });
    setReplyText('');
    setReplying(false);
    fetchInquiries();
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <div className="page-head">
        <div>
          <h1 className="page-title">お問い合わせ管理</h1>
          <p className="page-subtitle">お客様からの問い合わせを確認・返信します。</p>
        </div>
      </div>

      <div className="v-tabs">
        {([['all', 'すべて'], ['open', '未対応'], ['replied', '返信済み'], ['closed', '完了']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`v-tab ${statusFilter === key ? 'active' : ''}`}
          >
            {label}
            <span className="ct">{filterCounts[key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        {/* List */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-2">
          {loading && <div className="card text-center text-gray-400 text-sm py-8">読み込み中...</div>}
          {!loading && filtered.length === 0 && (
            <div className="card text-center text-gray-400 text-sm py-8">お問い合わせがありません</div>
          )}
          {filtered.map(inq => {
            const isSelected = selectedId === inq.id;
            const sc = STATUS_CONFIG[inq.status] || STATUS_CONFIG.open;
            return (
              <button
                key={inq.id}
                type="button"
                onClick={() => setSelectedId(inq.id)}
                className={`card w-full text-left cursor-pointer transition-colors ${
                  isSelected ? 'ring-2 ring-[#0C3290]' : 'hover:shadow-lg'
                }`}
                style={{ padding: '14px 16px' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={sc.badgeClass}>{sc.label}</span>
                  <span className="text-[10px] text-gray-400">{inq.createdAt?.slice(0, 10)}</span>
                  <span className="badge">{storeNameById.get(inq.storeId) || inq.storeId}</span>
                </div>
                <div className="text-sm font-bold text-[#1A1A1A]">{inq.customerName}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{inq.message}</div>
                {inq.selectedTier && (
                  <div className="text-[10px] text-[#0C3290] mt-1 font-semibold">検討コース: {inq.selectedTier}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          {!selected && (
            <div className="card text-center text-gray-400 text-sm min-h-[300px] flex items-center justify-center">
              お問い合わせを選択してください
            </div>
          )}
          {selected && (
            <div className="card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">{selected.customerName}</h2>
                  <div className="text-xs text-gray-400 mt-0.5">{selected.createdAt?.slice(0, 16).replace('T', ' ')}</div>
                </div>
                <select
                  value={selected.status}
                  onChange={e => changeStatus(selected.id, e.target.value)}
                  className="set-input"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                >
                  <option value="open">未対応</option>
                  <option value="replied">返信済み</option>
                  <option value="closed">完了</option>
                </select>
              </div>

              <div>
                <h3 className="sec-label sm">お客様情報</h3>
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-gray-400 w-16 inline-block">店舗</span><span className="text-gray-700">{storeNameById.get(selected.storeId) || selected.storeId}</span></div>
                  <div><span className="text-gray-400 w-16 inline-block">電話</span><a href={`tel:${selected.customerPhone}`} className="text-[#0C3290]">{selected.customerPhone || '—'}</a></div>
                  <div><span className="text-gray-400 w-16 inline-block">メール</span><a href={`mailto:${selected.customerEmail}`} className="text-[#0C3290]">{selected.customerEmail}</a></div>
                  {selected.vehicleInfo && (
                    <div><span className="text-gray-400 w-16 inline-block">車種</span><span className="text-gray-700">{selected.vehicleInfo}</span></div>
                  )}
                  {selected.selectedTier && (
                    <div><span className="text-gray-400 w-16 inline-block">コース</span><span className="text-[#0C3290] font-bold">{selected.selectedTier}</span></div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="sec-label sm">お問い合わせ内容</h3>
                <div className="bg-[#E8EEFB] border border-[#0C3290]/20 rounded-md p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                </div>
              </div>

              {Array.isArray((selected as unknown as Record<string, unknown>).replies) && (
                <div>
                  <h3 className="sec-label sm">返信履歴</h3>
                  <div className="space-y-2">
                    {((selected as unknown as Record<string, unknown>).replies as Array<{ email: string; text: string; createdAt: string }>).map((r: { email: string; text: string; createdAt: string }, i: number) => (
                      <div key={i} className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-green-800">{r.email}</span>
                          <span className="text-[10px] text-gray-400">{r.createdAt?.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.status !== 'closed' && (
                <div className="border-t border-[#EBEBEB] pt-3">
                  <h3 className="sec-label sm">お客様に返信</h3>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="返信内容を入力..."
                    className="set-input mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => sendReply(selected.id)}
                    disabled={replying || !replyText.trim()}
                    className="px-4 py-2 bg-[#0C3290] hover:bg-[#081f5e] text-white text-xs font-bold rounded-md disabled:opacity-50 cursor-pointer"
                  >
                    {replying ? '送信中...' : '返信を送信（メール送付）'}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">
                    送信するとお客様にメールが届きます。通知メールの「返信」ボタンからも直接返信できます。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
