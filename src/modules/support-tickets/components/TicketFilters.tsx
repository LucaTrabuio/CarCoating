'use client';

import {
  STATUS_CONFIG,
  TYPE_CONFIG,
  SEVERITY_CONFIG,
  type TicketFilter,
  type TicketStatus,
  type TicketType,
  type TicketSeverity,
} from '../types';

interface TicketFiltersProps {
  filter: TicketFilter;
  onChange: (filter: TicketFilter) => void;
  counts: Record<string, number>;
}

const STATUS_OPTIONS: Array<{ value: TicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'open', label: STATUS_CONFIG.open.label },
  { value: 'in_progress', label: STATUS_CONFIG.in_progress.label },
  { value: 'resolved', label: STATUS_CONFIG.resolved.label },
  { value: 'closed', label: STATUS_CONFIG.closed.label },
];

const TYPE_OPTIONS: Array<{ value: TicketType | 'all'; label: string }> = [
  { value: 'all', label: 'すべての種別' },
  { value: 'bug', label: TYPE_CONFIG.bug.label },
  { value: 'improvement', label: TYPE_CONFIG.improvement.label },
  { value: 'support', label: TYPE_CONFIG.support.label },
  { value: 'general', label: TYPE_CONFIG.general.label },
];

const SEVERITY_OPTIONS: Array<{ value: TicketSeverity | 'all'; label: string }> = [
  { value: 'all', label: 'すべての重要度' },
  { value: 'critical', label: SEVERITY_CONFIG.critical.label },
  { value: 'high', label: SEVERITY_CONFIG.high.label },
  { value: 'medium', label: SEVERITY_CONFIG.medium.label },
  { value: 'low', label: SEVERITY_CONFIG.low.label },
];

export default function TicketFilters({ filter, onChange, counts }: TicketFiltersProps) {
  const currentStatus = filter.status || 'all';
  const currentType = filter.type || 'all';
  const currentSeverity = filter.severity || 'all';

  return (
    <div className="space-y-3">
      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.value;
          const count = counts[opt.value] ?? 0;

          return (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filter, status: opt.value })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {opt.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dropdowns + search */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={currentType}
          onChange={(e) => onChange({ ...filter, type: e.target.value as TicketType | 'all' })}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={currentSeverity}
          onChange={(e) => onChange({ ...filter, severity: e.target.value as TicketSeverity | 'all' })}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            value={filter.search || ''}
            onChange={(e) => onChange({ ...filter, search: e.target.value })}
            placeholder="タイトルで検索..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 pl-8 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
