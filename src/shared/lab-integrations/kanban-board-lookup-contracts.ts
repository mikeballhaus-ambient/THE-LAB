import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

/** Static lookups for Help Desk kanban board Forms Builder stubs (group-by field). */
export function buildKanbanBoardFieldKeyLookups(): NonNullable<
  FormsBuilderContract['endpoints']['lookups']
> {
  return [
    {
      forProperty: 'fieldKey',
      endpoint: {
        url: '/api/connector/kanban-boards/field-keys',
        type: 'GET',
        data: {},
        response: [
          { id: 'status', value: 'status', label: 'Status' },
          { id: 'priority', value: 'priority', label: 'Priority' },
          { id: 'assigneeId', value: 'assigneeId', label: 'Assignee' },
        ],
      },
    },
  ];
}
