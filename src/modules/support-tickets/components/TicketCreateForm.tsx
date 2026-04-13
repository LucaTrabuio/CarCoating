'use client';

import { useState } from 'react';
import type { TicketType, TicketSeverity } from '../types';
import { TYPE_CONFIG, SEVERITY_CONFIG } from '../types';

interface TicketCreateFormProps {
  onSubmit: (data: {
    subject: string;
    type: TicketType;
    severity: TicketSeverity;
    message: string;
  }) => void;
  creating: boolean;
}

export default function TicketCreateForm({ onSubmit, creating }: TicketCreateFormProps) {
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<TicketType>('support');
  const [severity, setSeverity] = useState<TicketSeverity>('medium');
  const [message, setMessage] = useState('');

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !creating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ subject: subject.trim(), type, severity, message: message.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-bold text-gray-900">新規チケット作成</h3>

      {/* Subject */}
      <div>
        <label htmlFor="ticket-subject" className="mb-1 block text-xs font-medium text-gray-700">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="ticket-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="問題の概要を入力してください"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      {/* Type + Severity row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ticket-type" className="mb-1 block text-xs font-medium text-gray-700">
            種別
          </label>
          <select
            id="ticket-type"
            value={type}
            onChange={(e) => setType(e.target.value as TicketType)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(Object.entries(TYPE_CONFIG) as [TicketType, { label: string }][]).map(([value, cfg]) => (
              <option key={value} value={value}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticket-severity" className="mb-1 block text-xs font-medium text-gray-700">
            重要度
          </label>
          <select
            id="ticket-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as TicketSeverity)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(Object.entries(SEVERITY_CONFIG) as [TicketSeverity, { label: string }][]).map(
              ([value, cfg]) => (
                <option key={value} value={value}>
                  {cfg.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="ticket-message" className="mb-1 block text-xs font-medium text-gray-700">
          メッセージ <span className="text-red-500">*</span>
        </label>
        <textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="問題の詳細を記述してください"
          rows={5}
          className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? '送信中...' : 'チケットを作成'}
        </button>
      </div>
    </form>
  );
}
