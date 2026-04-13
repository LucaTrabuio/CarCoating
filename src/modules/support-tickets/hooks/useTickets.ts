'use client';

import { useState, useCallback } from 'react';
import type { Ticket, TicketType, TicketSeverity, TicketStatus } from '../types';

interface UseTicketsReturn {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  createTicket: (data: {
    subject: string;
    type: TicketType;
    severity: TicketSeverity;
    message: string;
  }) => Promise<Ticket | null>;
  reply: (ticketId: string, text: string) => Promise<boolean>;
  changeStatus: (ticketId: string, status: TicketStatus) => Promise<boolean>;
  editSubject: (ticketId: string, subject: string) => Promise<boolean>;
  deleteTicket: (ticketId: string) => Promise<boolean>;
  deleteMessage: (ticketId: string, messageIdx: number) => Promise<boolean>;
  exportCsv: () => void;
}

export function useTickets(apiBasePath: string = '/api/admin/tickets'): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBasePath);
      if (!res.ok) throw new Error(`取得に失敗しました (${res.status})`);
      const data = await res.json();
      setTickets(data.tickets ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [apiBasePath]);

  const createTicket = useCallback(
    async (data: {
      subject: string;
      type: TicketType;
      severity: TicketSeverity;
      message: string;
    }): Promise<Ticket | null> => {
      setError(null);
      try {
        const res = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', subject: data.subject, text: data.message, type: data.type, severity: data.severity }),
        });
        if (!res.ok) throw new Error(`作成に失敗しました (${res.status})`);
        const result = await res.json();
        // API returns { id } — refetch for full data
        await fetchTickets();
        return result as Ticket;
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        return null;
      }
    },
    [apiBasePath]
  );

  const reply = useCallback(
    async (ticketId: string, text: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reply', ticketId, text }),
        });
        if (!res.ok) throw new Error(`返信に失敗しました (${res.status})`);
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        return false;
      }
    },
    [apiBasePath]
  );

  const changeStatus = useCallback(
    async (ticketId: string, status: TicketStatus): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'changeStatus', ticketId, status }),
        });
        if (!res.ok) throw new Error(`ステータス変更に失敗しました (${res.status})`);
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        return false;
      }
    },
    [apiBasePath]
  );

  const editSubject = useCallback(
    async (ticketId: string, subject: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'editSubject', ticketId, subject }),
        });
        if (!res.ok) throw new Error(`タイトル変更に失敗しました (${res.status})`);
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        return false;
      }
    },
    [apiBasePath]
  );

  const deleteTicket = useCallback(
    async (ticketId: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', ticketId }),
        });
        if (!res.ok) throw new Error(`削除に失敗しました (${res.status})`);
        setTickets((prev) => prev.filter((t) => t.id !== ticketId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        return false;
      }
    },
    [apiBasePath]
  );

  const deleteMessage = useCallback(
    async (ticketId: string, messageIdx: number): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(apiBasePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteMessage', ticketId, messageIdx }),
        });
        if (!res.ok) throw new Error(`メッセージ削除に失敗しました (${res.status})`);
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
        return false;
      }
    },
    [apiBasePath]
  );

  const exportCsv = useCallback(() => {
    if (tickets.length === 0) return;

    const headers = ['キー', '種別', 'タイトル', '重要度', 'ステータス', '作成者', '担当者', '作成日', '更新日', '解決日', '完了日'];
    const rows = tickets.map((t) => [
      t.key,
      t.type,
      `"${t.subject.replace(/"/g, '""')}"`,
      t.severity,
      t.status,
      t.authorEmail,
      t.assigneeEmail || '',
      t.createdAt,
      t.updatedAt,
      t.resolvedAt || '',
      t.closedAt || '',
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tickets]);

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    createTicket,
    reply,
    changeStatus,
    editSubject,
    deleteTicket,
    deleteMessage,
    exportCsv,
  };
}
