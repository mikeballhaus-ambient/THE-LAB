import { describe, test, expect } from '@jest/globals';
import type { KanbanBoard } from '@/apps/lab-helpdesk/shared/types/kanban-board.types';
import { KANBAN_UNASSIGNED_VALUE } from '@/apps/lab-helpdesk/shared/types/kanban-board.types';
import {
  columnValueToTicketPatch,
  groupTicketsByBoardColumns,
  KANBAN_UNMAPPED_COLUMN_ID,
  readTicketFieldValue,
} from '@/apps/lab-helpdesk/shared/utils/kanban-board-utils';

describe('kanban-board-utils', () => {
  const statusBoard: KanbanBoard = {
    id: 1,
    name: 'Status',
    fieldKey: 'status',
    columns: [
      { id: 'a', label: 'New', value: 'new' },
      { id: 'b', label: 'Open', value: 'open' },
    ],
    sortOrder: 0,
    isSystem: true,
    createdAt: '',
    updatedAt: '',
  };

  test('readTicketFieldValue for assignee uses unassigned sentinel', () => {
    expect(readTicketFieldValue({ id: 1, assigneeId: null }, 'assigneeId')).toBe(KANBAN_UNASSIGNED_VALUE);
    expect(readTicketFieldValue({ id: 1, assigneeId: 'user-7' }, 'assigneeId')).toBe('user-7');
  });

  test('groupTicketsByBoardColumns maps and collects unmapped', () => {
    const tickets = [
      { id: 1, status: 'new' },
      { id: 2, status: 'open' },
      { id: 3, status: 'closed' },
    ];
    const grouped = groupTicketsByBoardColumns(statusBoard, tickets);
    expect(grouped.get('a')?.map(t => t.id)).toEqual([1]);
    expect(grouped.get('b')?.map(t => t.id)).toEqual([2]);
    expect(grouped.get(KANBAN_UNMAPPED_COLUMN_ID)?.map(t => t.id)).toEqual([3]);
  });

  test('columnValueToTicketPatch', () => {
    expect(columnValueToTicketPatch('status', 'open')).toEqual({ status: 'open' });
    expect(columnValueToTicketPatch('assigneeId', KANBAN_UNASSIGNED_VALUE)).toEqual({ assigneeId: null });
    expect(columnValueToTicketPatch('assigneeId', '42')).toEqual({ assigneeId: '42' });
  });
});
