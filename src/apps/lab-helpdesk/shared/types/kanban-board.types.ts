import type { TicketPriority, TicketStatus } from './ticket.types';

/** Ticket fields that can drive kanban columns. */
export type KanbanBoardFieldKey = 'status' | 'priority' | 'assigneeId';

export interface KanbanBoardColumn {
  id: string;
  label: string;
  /** Enum value, assignee id, or `__unassigned__` for empty assignee. */
  value: string;
}

export interface KanbanBoard {
  id: number;
  name: string;
  fieldKey: KanbanBoardFieldKey;
  columns: KanbanBoardColumn[];
  sortOrder: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoardCreateInput {
  name: string;
  fieldKey: KanbanBoardFieldKey;
  columns: KanbanBoardColumn[];
  sortOrder?: number;
}

export interface KanbanBoardUpdateInput {
  name?: string;
  fieldKey?: KanbanBoardFieldKey;
  columns?: KanbanBoardColumn[];
  sortOrder?: number;
}

export const KANBAN_UNASSIGNED_VALUE = '__unassigned__';

export const KANBAN_FIELD_OPTIONS: { label: string; value: KanbanBoardFieldKey }[] = [
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
  { label: 'Assignee', value: 'assigneeId' },
];

export const STATUS_VALUE_OPTIONS: { label: string; value: TicketStatus }[] = [
  { label: 'New', value: 'new' },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

export const PRIORITY_VALUE_OPTIONS: { label: string; value: TicketPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
];
