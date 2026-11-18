import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import type { KanbanBoardColumn, KanbanBoardFieldKey } from '../../shared/types/kanban-board.types';
import {
  KANBAN_UNASSIGNED_VALUE,
  PRIORITY_VALUE_OPTIONS,
  STATUS_VALUE_OPTIONS,
} from '../../shared/types/kanban-board.types';
import { serializeKanbanColumns } from '../../shared/utils/kanban-board-utils';

export interface SeedApplyOptions {
  /** Settings admin Apply — ignores boot suppress flags. */
  adminApply?: boolean;
}

function defaultStatusColumns(): KanbanBoardColumn[] {
  return STATUS_VALUE_OPTIONS.map((opt) => ({
    id: randomUUID(),
    label: opt.label,
    value: opt.value,
  }));
}

function defaultPriorityColumns(): KanbanBoardColumn[] {
  return PRIORITY_VALUE_OPTIONS.map((opt) => ({
    id: randomUUID(),
    label: opt.label,
    value: opt.value,
  }));
}

export function countSystemKanbanBoards(db: Database): number {
  try {
    const row = db.prepare('SELECT COUNT(*) AS c FROM kanban_boards WHERE is_system = 1').get() as { c: number };
    return row.c;
  } catch {
    return 0;
  }
}

/** Inserts default system kanban boards when none exist (custom boards may remain). */
export function seedKanbanSystemBoardsIfMissing(db: Database, options?: SeedApplyOptions): number {
  if (!options?.adminApply && isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.HELP_DESK_KANBAN)) {
    return 0;
  }
  if (countSystemKanbanBoards(db) > 0) {
    return 0;
  }
  const now = new Date().toISOString();
  const seeds: { name: string; fieldKey: KanbanBoardFieldKey; columns: KanbanBoardColumn[]; sort: number }[] =
    [
      { name: 'By status', fieldKey: 'status', columns: defaultStatusColumns(), sort: 0 },
      { name: 'By priority', fieldKey: 'priority', columns: defaultPriorityColumns(), sort: 1 },
      {
        name: 'By assignee',
        fieldKey: 'assigneeId',
        columns: [{ id: randomUUID(), label: 'Unassigned', value: KANBAN_UNASSIGNED_VALUE }],
        sort: 2,
      },
    ];
  const insert = db.prepare(
    `INSERT INTO kanban_boards (name, field_key, columns_json, sort_order, is_system, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
  );
  let inserted = 0;
  for (const seed of seeds) {
    insert.run(
      seed.name,
      seed.fieldKey,
      serializeKanbanColumns(seed.columns),
      seed.sort,
      now,
      now,
    );
    inserted += 1;
  }
  return inserted;
}
