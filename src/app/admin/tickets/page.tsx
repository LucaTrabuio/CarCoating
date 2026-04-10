'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface TicketMessage {
  uid: string;
  email: string;
  text: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  storeId: string;
  authorUid: string;
  authorEmail: string;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'オープン', color: 'bg-amber-100 text-amber-800' },
  in_progress: { label: '対応中', color: 'bg-blue-100 text-blue-800' },
  closed: { label: '完了', color: 'bg-gray-100 text-gray-600' },
};

type StatusFilter = 'all' | 'open' | 'in_progress' | 'closed';

export default function TicketsPage() {
  const user = useAdminAuth();
  const isSuper = user.role === 'super_admin';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(isSuper ? 'open' : 'all');

  // Create form
  const [newSubject, setNewSubject] = useState('');
  const [newText, setNewText] = useState('');
  const [creating, setCreating] = useState(false);

  // Reply
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Edit subject (super_admin only)
  const [editingSubject, setEditingSubject] = useState(false);
  const [editSubjectValue, setEditSubjectValue] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tickets', { cache: 'no-store' });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === 'all') return tickets;
    return tickets.filter(t => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) ?? null;

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newText.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', subject: newSubject, text: newText }),
      });
      if (res.ok) {
        setNewSubject('');
        setNewText('');
        setShowCreate(false);
        fetchTickets();
      }
    } catch { /* */ }
    setCreating(false);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    setReplying(true);
    try {
      await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', ticketId: selectedTicketId, text: replyText }),
      });
      setReplyText('');
      fetchTickets();
    } catch { /* */ }
    setReplying(false);
  }

  async function changeStatus(ticketId: string, status: string) {
    await fetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', ticketId, status }),
    });
    fetchTickets();
  }

  async function editSubject(ticketId: string) {
    if (!editSubjectValue.trim()) return;
    await fetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', ticketId, subject: editSubjectValue }),
    });
    setEditingSubject(false);
    fetchTickets();
  }

  async function deleteTicket(ticketId: string) {
    if (!confirm('このチケットを完全に削除しますか？')) return;
    await fetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ticketId }),
    });
    setSelectedTicketId(null);
    fetchTickets();
  }

  async function deleteMessage(ticketId: string, messageIndex: number) {
    if (!confirm('このメッセージを削除しますか？')) return;
    await fetch('/api/admin/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_message', ticketId, messageIndex }),
    });
    fetchTickets();
  }

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tickets.length, open: 0, in_progress: 0, closed: 0 };
    tickets.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return counts;
  }, [tickets]);

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">チケット</h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setSelectedTicketId(null); }}
          className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
        >
          + 新規チケット
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2">
        {([['all', 'すべて'], ['open', 'オープン'], ['in_progress', '対応中'], ['closed', '完了']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === key
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label} ({filterCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createTicket} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">新規チケット作成</h2>
          <input
            type="text"
            placeholder="件名"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <textarea
            placeholder="内容を入力してください"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer">
              {creating ? '送信中...' : '送信'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* List + Detail side by side */}
      <div className="flex gap-4 flex-wrap lg:flex-nowrap">
        {/* Ticket list */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-2">
          {loading && <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>}
          {!loading && filteredTickets.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              {statusFilter === 'all' ? 'チケットがありません' : `「${STATUS_CONFIG[statusFilter]?.label}」のチケットはありません`}
            </div>
          )}
          {filteredTickets.map(t => {
            const isSelected = selectedTicketId === t.id;
            const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setSelectedTicketId(t.id); setShowCreate(false); setReplyText(''); setEditingSubject(false); }}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-colors cursor-pointer ${
                  isSelected ? 'border-amber-400 border-2' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                  <span className="text-[10px] text-gray-400">{t.createdAt?.slice(0, 10)}</span>
                </div>
                <div className="text-sm font-bold text-[#0f1c2e] truncate">{t.subject}</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {t.authorEmail} · {t.messages?.length || 0} メッセージ
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {!selectedTicket && !showCreate && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm min-h-[300px] flex items-center justify-center">
              チケットを選択してください
            </div>
          )}

          {selectedTicket && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingSubject ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editSubjectValue}
                          onChange={e => setEditSubjectValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-bold"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') editSubject(selectedTicket.id); if (e.key === 'Escape') setEditingSubject(false); }}
                        />
                        <button onClick={() => editSubject(selectedTicket.id)} className="text-xs text-amber-600 font-bold cursor-pointer">保存</button>
                        <button onClick={() => setEditingSubject(false)} className="text-xs text-gray-400 cursor-pointer">×</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#0f1c2e] truncate">{selectedTicket.subject}</h2>
                        {isSuper && (
                          <button
                            onClick={() => { setEditingSubject(true); setEditSubjectValue(selectedTicket.subject); }}
                            className="text-[10px] text-gray-400 hover:text-amber-600 cursor-pointer shrink-0"
                            title="件名を編集"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">
                      作成: {selectedTicket.authorEmail} · {selectedTicket.createdAt?.slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isSuper && (
                      <>
                        <select
                          value={selectedTicket.status}
                          onChange={e => changeStatus(selectedTicket.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="open">オープン</option>
                          <option value="in_progress">対応中</option>
                          <option value="closed">完了</option>
                        </select>
                        <button
                          onClick={() => deleteTicket(selectedTicket.id)}
                          className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                          title="チケットを削除"
                        >
                          🗑
                        </button>
                      </>
                    )}
                    {!isSuper && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[selectedTicket.status]?.color}`}>
                        {STATUS_CONFIG[selectedTicket.status]?.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                {selectedTicket.messages?.map((msg, i) => {
                  const isMine = msg.uid === user.uid;
                  return (
                    <div key={i} className={`px-4 py-3 group ${isMine ? 'bg-amber-50/30' : ''}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0f1c2e]">{msg.email}</span>
                          <span className="text-[10px] text-gray-400">{msg.createdAt?.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        {isSuper && (
                          <button
                            onClick={() => deleteMessage(selectedTicket.id, i)}
                            className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="メッセージを削除"
                          >
                            削除
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={sendReply} className="p-4 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="返信を入力..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="submit"
                    disabled={replying || !replyText.trim()}
                    className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    送信
                  </button>
                </form>
              )}
              {selectedTicket.status === 'closed' && (
                <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
                  このチケットは完了しました
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
