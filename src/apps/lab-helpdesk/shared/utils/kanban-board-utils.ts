import type { KanbanBoard, KanbanBoardColumn, KanbanBoardFieldKey } from '../types/kanban-board.types';
import { KANBAN_UNASSIGNED_VALUE } from '../types/kanban-board.types';
import type { TicketUpdateInput } from '../types/ticket.types';

export interface TicketKanbanShape {
  id: number;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
}

export const KANBAN_UNMAPPED_COLUMN_ID = '__unmapped__';

export function readTicketFieldValue(
  ticket: TicketKanbanShape,
  fieldKey: KanbanBoardFieldKey,
): string {
  if (fieldKey === 'assigneeId') {
    const raw = ticket.assigneeId?.trim();
    return raw ? raw : KANBAN_UNASSIGNED_VALUE;
  }
  const raw = ticket[fieldKey];
  return raw == null || raw === '' ? '' : String(raw);
}

export function columnValueToTicketPatch(
  fieldKey: KanbanBoardFieldKey,
  columnValue: string,
): TicketUpdateInput {
  if (fieldKey === 'status') {
    return { status: columnValue as TicketUpdateInput['status'] };
  }
  if (fieldKey === 'priority') {
    return { priority: columnValue as TicketUpdateInput['priority'] };
  }
  if (columnValue === KANBAN_UNASSIGNED_VALUE) {
    return { assigneeId: null };
  }
  return { assigneeId: columnValue };
}

export function groupTicketsByBoardColumns<T extends TicketKanbanShape>(
  board: KanbanBoard,
  tickets: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const col of board.columns) {
    map.set(col.id, []);
  }
  const unmapped: T[] = [];
  for (const ticket of tickets) {
    const value = readTicketFieldValue(ticket, board.fieldKey);
    const col = board.columns.find(c => c.value === value);
    if (col) {
      map.get(col.id)?.push(ticket);
    } else {
      unmapped.push(ticket);
    }
  }
  if (unmapped.length > 0) {
    map.set(KANBAN_UNMAPPED_COLUMN_ID, unmapped);
  }
  return map;
}

export function parseKanbanColumnsJson(raw: string): KanbanBoardColumn[] {
  try {
    const parsed = JSON.parse(raw) as KanbanBoardColumn[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      c => c && typeof c.id === 'string' && typeof c.label === 'string' && typeof c.value === 'string',
    );
  } catch {
    return [];
  }
}

export function serializeKanbanColumns(columns: KanbanBoardColumn[]): string {
  return JSON.stringify(columns);
}
