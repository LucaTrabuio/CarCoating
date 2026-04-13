'use client';

import {
  TYPE_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  type TicketType,
  type TicketSeverity,
  type TicketStatus,
} from '../types';

interface TicketStatusBadgeProps {
  kind: 'type' | 'severity' | 'status';
  value: string;
}

export default function TicketStatusBadge({ kind, value }: TicketStatusBadgeProps) {
  let config: { label: string; color: string } | undefined;

  if (kind === 'type') {
    config = TYPE_CONFIG[value as TicketType];
  } else if (kind === 'severity') {
    config = SEVERITY_CONFIG[value as TicketSeverity];
  } else if (kind === 'status') {
    config = STATUS_CONFIG[value as TicketStatus];
  }

  if (!config) {
    return (
      <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-500">
        {value}
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${config.color}`}
    >
      {config.label}
    </span>
  );
}
