'use client';

import type { Ticket } from '../types';
import TicketStatusBadge from './TicketStatusBadge';

interface TicketTableProps {
  tickets: Ticket[];
  onRowClick: (ticket: Ticket) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortAsc: boolean;
}

const COLUMNS: { key: string; label: string; hideOnMobile?: boolean }[] = [
  { key: 'key', label: 'キー' },
  { key: 'type', label: '種別' },
  { key: 'subject', label: 'タイトル' },
  { key: 'severity', label: '重要度' },
  { key: 'status', label: 'ステータス' },
  { key: 'assigneeEmail', label: '担当者', hideOnMobile: true },
  { key: 'createdAt', label: '作成日' },
  { key: 'resolvedAt', label: '解決日', hideOnMobile: true },
  { key: 'closedAt', label: '完了', hideOnMobile: true },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function SortIndicator({ field, sortField, sortAsc }: { field: string; sortField: string; sortAsc: boolean }) {
  if (field !== sortField) return null;
  return <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>;
}

export default function TicketTable({ tickets, onRowClick, onSort, sortField, sortAsc }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-gray-400">
        チケットがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold text-gray-700 hover:bg-gray-100 ${
                  col.hideOnMobile ? 'hidden md:table-cell' : ''
                }`}
              >
                {col.label}
                <SortIndicator field={col.key} sortField={sortField} sortAsc={sortAsc} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              onClick={() => onRowClick(ticket)}
              className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-blue-50/40"
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-blue-600 font-semibold">
                {ticket.key || ticket.id.slice(0, 8)}
              </td>
              <td className="px-3 py-2">
                <TicketStatusBadge kind="type" value={ticket.type || 'general'} />
              </td>
              <td className="px-3 py-2 max-w-[200px] md:max-w-[360px] truncate" title={ticket.subject}>
                {ticket.subject}
              </td>
              <td className="px-3 py-2">
                <TicketStatusBadge kind="severity" value={ticket.severity || 'medium'} />
              </td>
              <td className="px-3 py-2">
                <TicketStatusBadge kind="status" value={ticket.status} />
              </td>
              <td className="hidden md:table-cell px-3 py-2 text-gray-600 text-xs truncate max-w-[160px]">
                {ticket.assigneeEmail || '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                {formatDate(ticket.createdAt)}
              </td>
              <td className="hidden md:table-cell whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                {formatDate(ticket.resolvedAt)}
              </td>
              <td className="hidden md:table-cell whitespace-nowrap px-3 py-2 text-center text-gray-400">
                {ticket.closedAt ? (
                  <span className="text-green-600" title={formatDate(ticket.closedAt)}>
                    &#x2715;
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
