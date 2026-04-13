export interface TicketMessage {
  uid: string;
  email: string;
  text: string;
  createdAt: string;
}

export type TicketType = 'bug' | 'improvement' | 'support' | 'general';
export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  key: string; // "TKT-001"
  type: TicketType;
  severity: TicketSeverity;
  subject: string;
  status: TicketStatus;
  authorUid: string;
  authorEmail: string;
  assigneeEmail?: string;
  storeId?: string;
  messages: TicketMessage[];
  labels?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

export const TYPE_CONFIG: Record<TicketType, { label: string; color: string }> = {
  bug: { label: 'バグ', color: 'bg-red-100 text-red-700' },
  improvement: { label: '改善', color: 'bg-green-100 text-green-700' },
  support: { label: 'サポート', color: 'bg-blue-100 text-blue-700' },
  general: { label: '一般', color: 'bg-gray-100 text-gray-600' },
};

export const SEVERITY_CONFIG: Record<TicketSeverity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
};

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'オープン', color: 'bg-amber-100 text-amber-800' },
  in_progress: { label: '対応中', color: 'bg-blue-100 text-blue-800' },
  resolved: { label: '解決済', color: 'bg-green-100 text-green-800' },
  closed: { label: '完了', color: 'bg-gray-100 text-gray-600' },
};

export interface TicketFilter {
  status?: TicketStatus | 'all';
  type?: TicketType | 'all';
  severity?: TicketSeverity | 'all';
  search?: string;
}
