'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import {
  TicketTable,
  TicketFilters,
  TicketDetail,
  TicketCreateForm,
  useTickets,
  type Ticket,
  type TicketFilter,
} from '@/modules/support-tickets';

export default function TicketsPage() {
  const user = useAdminAuth();
  const isSuper = user.role === 'super_admin';
  const { tickets, loading, fetchTickets, createTicket, reply, changeStatus, editSubject, deleteTicket, deleteMessage, exportCsv } = useTickets();

  const [filter, setFilter] = useState<TicketFilter>({ status: 'open' });
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Filter tickets
  const filtered = useMemo(() => {
    let list = [...tickets];
    if (filter.status && filter.status !== 'all') list = list.filter(t => t.status === filter.status);
    if (filter.type && filter.type !== 'all') list = list.filter(t => t.type === filter.type);
    if (filter.severity && filter.severity !== 'all') list = list.filter(t => t.severity === filter.severity);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(t => t.subject.toLowerCase().includes(q) || t.authorEmail.toLowerCase().includes(q));
    }
    return list;
  }, [tickets, filter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortField] || '');
      const bv = String((b as unknown as Record<string, unknown>)[sortField] || '');
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortField, sortAsc]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    tickets.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [tickets]);

  function handleSort(field: string) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  async function handleCreate(data: { subject: string; type: string; severity: string; message: string }) {
    setCreating(true);
    const result = await createTicket(data as Parameters<typeof createTicket>[0]);
    if (result) {
      setShowCreate(false);
      fetchTickets();
    }
    setCreating(false);
  }

  // Keep selected ticket in sync with latest data
  const currentSelected = selectedTicket ? tickets.find(t => t.id === selectedTicket.id) || null : null;

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">チケット</h1>
        <div className="flex items-center gap-2">
          {isSuper && (
            <button onClick={exportCsv} className="px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              CSV出力
            </button>
          )}
          <button
            onClick={() => { setShowCreate(!showCreate); setSelectedTicket(null); }}
            className="px-4 py-2 bg-amber-500 text-[#0C3290] text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
          >
            + 新規チケット
          </button>
        </div>
      </div>

      <TicketFilters filter={filter} onChange={setFilter} counts={counts} />

      {showCreate && (
        <TicketCreateForm
          onSubmit={handleCreate}
          creating={creating}
        />
      )}

      {loading && <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>}

      {!loading && !showCreate && !currentSelected && (
        <TicketTable
          tickets={sorted}
          onRowClick={t => setSelectedTicket(t)}
          onSort={handleSort}
          sortField={sortField}
          sortAsc={sortAsc}
        />
      )}

      {currentSelected && (
        <TicketDetail
          ticket={currentSelected}
          currentUserEmail={user.email}
          isSuper={isSuper}
          onReply={async (text) => { await reply(currentSelected.id, text); fetchTickets(); }}
          onStatusChange={async (status) => { await changeStatus(currentSelected.id, status); fetchTickets(); }}
          onEdit={async (subject) => { await editSubject(currentSelected.id, subject); fetchTickets(); }}
          onDelete={async () => { await deleteTicket(currentSelected.id); setSelectedTicket(null); fetchTickets(); }}
          onDeleteMessage={async (idx) => { await deleteMessage(currentSelected.id, idx); fetchTickets(); }}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {!loading && sorted.length === 0 && !showCreate && !currentSelected && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          チケットがありません
        </div>
      )}
    </div>
  );
}
