'use client';

import { useState } from 'react';
import type { Ticket, TicketMessage, TicketStatus, TicketSeverity } from '../types';
import { STATUS_CONFIG, SEVERITY_CONFIG } from '../types';
import TicketStatusBadge from './TicketStatusBadge';

interface TicketDetailProps {
  ticket: Ticket;
  currentUserEmail: string;
  isSuper: boolean;
  onReply: (text: string) => void;
  onStatusChange: (status: TicketStatus) => void;
  onEdit: (subject: string) => void;
  onDelete: () => void;
  onDeleteMessage: (messageIdx: number) => void;
  onClose: () => void;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function MessageBubble({
  message,
  index,
  isCurrentUser,
  isSuper,
  onDelete,
}: {
  message: TicketMessage;
  index: number;
  isCurrentUser: boolean;
  isSuper: boolean;
  onDelete: (idx: number) => void;
}) {
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[80%] rounded-lg px-4 py-3 text-sm ${
          isCurrentUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <div className={`mb-1 text-[10px] font-medium ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
          {message.email} - {formatDateTime(message.createdAt)}
        </div>
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
        {(isSuper || isCurrentUser) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('このメッセージを削除しますか？')) {
                onDelete(index);
              }
            }}
            className={`absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-opacity opacity-0 group-hover/msg:opacity-100 hover:opacity-100 ${
              isCurrentUser
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
            title="メッセージを削除"
          >
            &#x2715;
          </button>
        )}
      </div>
    </div>
  );
}

export default function TicketDetail({
  ticket,
  currentUserEmail,
  isSuper,
  onReply,
  onStatusChange,
  onEdit,
  onDelete,
  onDeleteMessage,
  onClose,
}: TicketDetailProps) {
  const [replyText, setReplyText] = useState('');
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState(ticket.subject);

  const handleReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setReplyText('');
  };

  const handleSubjectSave = () => {
    const trimmed = subjectDraft.trim();
    if (trimmed && trimmed !== ticket.subject) {
      onEdit(trimmed);
    }
    setEditingSubject(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleReply();
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 px-4 py-3 md:px-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-blue-600 font-semibold">{ticket.key}</span>
            <TicketStatusBadge kind="type" value={ticket.type} />
            <TicketStatusBadge kind="severity" value={ticket.severity} />
          </div>

          {editingSubject && isSuper ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubjectSave();
                  if (e.key === 'Escape') setEditingSubject(false);
                }}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleSubjectSave}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setEditingSubject(false);
                  setSubjectDraft(ticket.subject);
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <h2
              className={`text-base font-bold text-gray-900 truncate ${isSuper ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={() => {
                if (isSuper) {
                  setEditingSubject(true);
                  setSubjectDraft(ticket.subject);
                }
              }}
              title={isSuper ? 'クリックして編集' : undefined}
            >
              {ticket.subject}
            </h2>
          )}

          {/* Meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <span>作成者: {ticket.authorEmail}</span>
            {ticket.assigneeEmail && <span>担当者: {ticket.assigneeEmail}</span>}
            <span>作成日: {formatDateTime(ticket.createdAt)}</span>
            {ticket.resolvedAt && <span>解決日: {formatDateTime(ticket.resolvedAt)}</span>}
          </div>
        </div>

        <div className="ml-3 flex items-center gap-2 shrink-0">
          {/* Status dropdown */}
          {isSuper && (
            <select
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(Object.entries(STATUS_CONFIG) as [TicketStatus, { label: string }][]).map(
                ([value, cfg]) => (
                  <option key={value} value={value}>
                    {cfg.label}
                  </option>
                )
              )}
            </select>
          )}

          {/* Delete ticket */}
          {isSuper && (
            <button
              onClick={() => {
                if (window.confirm('このチケットを削除しますか？この操作は取り消せません。')) {
                  onDelete();
                }
              }}
              className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
              title="チケットを削除"
            >
              削除
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="閉じる"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-3">
        {ticket.messages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">メッセージはありません</div>
        ) : (
          ticket.messages.map((msg, idx) => (
            <div key={`${msg.createdAt}-${idx}`} className="group/msg">
              <MessageBubble
                message={msg}
                index={idx}
                isCurrentUser={msg.email === currentUserEmail}
                isSuper={isSuper}
                onDelete={onDeleteMessage}
              />
            </div>
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="border-t border-gray-200 px-4 py-3 md:px-6">
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="返信を入力... (Ctrl+Enter で送信)"
            rows={2}
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
