# Support Tickets Module

Backlog/Jira風のサポートチケット管理モジュール。再利用可能なコンポーネント群とデータフェッチ用のフックを提供します。

## インポート

```tsx
import {
  TicketTable,
  TicketDetail,
  TicketFilters,
  TicketCreateForm,
  TicketStatusBadge,
  useTickets,
  type Ticket,
  type TicketFilter,
} from '@/modules/support-tickets';
```

## コンポーネント

### TicketTable

チケット一覧テーブル。ソート・クリックイベント対応。

| Prop | 型 | 説明 |
|------|------|------|
| `tickets` | `Ticket[]` | 表示するチケット配列 |
| `onRowClick` | `(ticket: Ticket) => void` | 行クリック時のコールバック |
| `onSort` | `(field: string) => void` | カラムヘッダークリック時のソートコールバック |
| `sortField` | `string` | 現在のソートフィールド名 |
| `sortAsc` | `boolean` | 昇順ソートかどうか |

### TicketFilters

ステータスチップ・種別/重要度ドロップダウン・テキスト検索を含むフィルターバー。

| Prop | 型 | 説明 |
|------|------|------|
| `filter` | `TicketFilter` | 現在のフィルター状態 |
| `onChange` | `(filter: TicketFilter) => void` | フィルター変更時のコールバック |
| `counts` | `Record<string, number>` | ステータスごとのチケット数 |

### TicketDetail

チケット詳細・スレッド表示。メッセージの送信、ステータス変更、削除機能を含む。

| Prop | 型 | 説明 |
|------|------|------|
| `ticket` | `Ticket` | 表示するチケット |
| `currentUserEmail` | `string` | 現在のユーザーメール |
| `isSuper` | `boolean` | 管理者権限の有無 |
| `onReply` | `(text: string) => void` | 返信送信時 |
| `onStatusChange` | `(status: TicketStatus) => void` | ステータス変更時 |
| `onEdit` | `(subject: string) => void` | タイトル編集時 |
| `onDelete` | `() => void` | チケット削除時 |
| `onDeleteMessage` | `(messageIdx: number) => void` | メッセージ削除時 |
| `onClose` | `() => void` | 詳細パネルを閉じる時 |

### TicketCreateForm

新規チケット作成フォーム。

| Prop | 型 | 説明 |
|------|------|------|
| `onSubmit` | `(data: { subject, type, severity, message }) => void` | 送信時のコールバック |
| `creating` | `boolean` | 送信中フラグ（ボタン無効化用） |

### TicketStatusBadge

種別・重要度・ステータスのカラーバッジ。

| Prop | 型 | 説明 |
|------|------|------|
| `kind` | `'type' \| 'severity' \| 'status'` | バッジの種類 |
| `value` | `string` | 表示する値 (例: `'bug'`, `'critical'`, `'open'`) |

## Hook: useTickets

```tsx
const {
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
} = useTickets('/api/admin/tickets');
```

| 関数 | 引数 | 戻り値 | 説明 |
|------|------|--------|------|
| `fetchTickets` | なし | `Promise<void>` | チケット一覧を取得 |
| `createTicket` | `{ subject, type, severity, message }` | `Promise<Ticket \| null>` | チケットを作成 |
| `reply` | `(ticketId, text)` | `Promise<boolean>` | メッセージを返信 |
| `changeStatus` | `(ticketId, status)` | `Promise<boolean>` | ステータスを変更 |
| `editSubject` | `(ticketId, subject)` | `Promise<boolean>` | タイトルを変更 |
| `deleteTicket` | `(ticketId)` | `Promise<boolean>` | チケットを削除 |
| `deleteMessage` | `(ticketId, messageIdx)` | `Promise<boolean>` | メッセージを削除 |
| `exportCsv` | なし | `void` | CSVファイルをダウンロード |

## 必要なAPIエンドポイント

### `GET /api/admin/tickets`

レスポンス: `{ tickets: Ticket[] }` または `Ticket[]`

### `POST /api/admin/tickets`

リクエストボディの `action` フィールドで操作を判別:

| action | 追加フィールド | レスポンス |
|--------|---------------|-----------|
| `create` | `subject`, `type`, `severity`, `message` | 作成された `Ticket` |
| `reply` | `ticketId`, `text` | 更新された `Ticket` |
| `changeStatus` | `ticketId`, `status` | 更新された `Ticket` |
| `editSubject` | `ticketId`, `subject` | 更新された `Ticket` |
| `delete` | `ticketId` | `{ success: true }` |
| `deleteMessage` | `ticketId`, `messageIdx` | 更新された `Ticket` |

## Firestoreコレクション構造

```
tickets/
  {ticketId}/
    id: string
    key: string              // "TKT-001"
    type: "bug" | "improvement" | "support" | "general"
    severity: "critical" | "high" | "medium" | "low"
    subject: string
    status: "open" | "in_progress" | "resolved" | "closed"
    authorUid: string
    authorEmail: string
    assigneeEmail?: string
    storeId?: string
    messages: TicketMessage[]
    labels?: string[]
    createdAt: string (ISO)
    updatedAt: string (ISO)
    resolvedAt?: string (ISO)
    closedAt?: string (ISO)
```

## 使用例

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const { tickets, loading, fetchTickets, createTicket, reply, changeStatus, editSubject, deleteTicket, deleteMessage } =
    useTickets('/api/admin/tickets');

  const [filter, setFilter] = useState<TicketFilter>({ status: 'all', type: 'all', severity: 'all', search: '' });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // カウント計算
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tickets) {
      c[t.status] = (c[t.status] || 0) + 1;
    }
    return c;
  }, [tickets]);

  // フィルター適用
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (filter.status && filter.status !== 'all' && t.status !== filter.status) return false;
      if (filter.type && filter.type !== 'all' && t.type !== filter.type) return false;
      if (filter.severity && filter.severity !== 'all' && t.severity !== filter.severity) return false;
      if (filter.search && !t.subject.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }, [tickets, filter]);

  // ソート適用
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField] ?? '';
      const bVal = (b as Record<string, unknown>)[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">サポートチケット</h1>
        <button onClick={() => setShowCreate(true)} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          新規作成
        </button>
      </div>

      <TicketFilters filter={filter} onChange={setFilter} counts={counts} />
      <TicketTable tickets={sorted} onRowClick={setSelectedTicket} onSort={handleSort} sortField={sortField} sortAsc={sortAsc} />

      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          currentUserEmail="admin@example.com"
          isSuper={true}
          onReply={(text) => reply(selectedTicket.id, text)}
          onStatusChange={(status) => changeStatus(selectedTicket.id, status)}
          onEdit={(subject) => editSubject(selectedTicket.id, subject)}
          onDelete={() => { deleteTicket(selectedTicket.id); setSelectedTicket(null); }}
          onDeleteMessage={(idx) => deleteMessage(selectedTicket.id, idx)}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {showCreate && (
        <TicketCreateForm
          onSubmit={async (data) => { await createTicket(data); setShowCreate(false); }}
          creating={loading}
        />
      )}
    </div>
  );
}
```
