import type { TicketPriority, TicketStatus } from '../types/ticket.types';

export interface DashboardChartSegment {
  key: string;
  label: string;
  value: number;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const STATUS_ORDER: TicketStatus[] = ['new', 'open', 'pending', 'resolved', 'closed'];

function countByField(
  tickets: { status?: string; priority?: string }[],
  field: 'status' | 'priority',
  labelMap: Record<string, string>,
  orderedKeys?: string[],
): DashboardChartSegment[] {
  const counts = new Map<string, number>();
  for (const row of tickets) {
    const raw = row[field];
    const key = raw == null || raw === '' ? '_empty' : String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries = [...counts.entries()].map(([key, value]) => ({
    key,
    label: key === '_empty' ? 'Unset' : labelMap[key] ?? key,
    value,
  }));
  if (orderedKeys) {
    return orderedKeys
      .filter(k => counts.has(k))
      .map(k => ({
        key: k,
        label: labelMap[k] ?? k,
        value: counts.get(k) ?? 0,
      }));
  }
  return entries.sort((a, b) => b.value - a.value);
}

export function ticketStatusCounts(
  tickets: { status?: string }[],
): DashboardChartSegment[] {
  return countByField(tickets, 'status', STATUS_LABELS, STATUS_ORDER);
}

export function ticketPriorityCounts(
  tickets: { priority?: string }[],
): DashboardChartSegment[] {
  return countByField(tickets, 'priority', PRIORITY_LABELS);
}

export function countTicketsByStatus(
  tickets: { status?: string }[],
  status: TicketStatus,
): number {
  return tickets.filter(t => t.status === status).length;
}

export function countOpenQueue(tickets: { status?: string }[]): number {
  return tickets.filter(t => {
    const s = t.status;
    return s === 'new' || s === 'open' || s === 'pending';
  }).length;
}

export function countHighPriority(tickets: { priority?: string }[]): number {
  return tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
}

export const KANBAN_STATUSES: TicketStatus[] = STATUS_ORDER;

export function statusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status];
}

export function priorityLabel(priority: TicketPriority): string {
  return PRIORITY_LABELS[priority];
}
