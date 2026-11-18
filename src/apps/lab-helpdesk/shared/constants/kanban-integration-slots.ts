export const KANBAN_BOARD_INTEGRATION_SLOTS = {
  create: 'kanban.board.create.dialog',
  edit: 'kanban.board.edit.dialog',
  delete: 'kanban.board.delete.dialog',
} as const;

export type KanbanBoardIntegrationSlot =
  (typeof KANBAN_BOARD_INTEGRATION_SLOTS)[keyof typeof KANBAN_BOARD_INTEGRATION_SLOTS];
