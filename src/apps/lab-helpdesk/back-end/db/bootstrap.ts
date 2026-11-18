import type { AppDatabaseServiceProxy } from '../../db/app-db-service';
import { ensureHelpDeskCoreSchema } from './ensure-help-desk-schema';
import { KanbanBoardService } from '../services/kanban-board-service';

const MIGRATION_TICKETS = 'v1_tickets';
const MIGRATION_KANBAN_BOARDS = 'v2_kanban_boards';

async function hasMigration(db: AppDatabaseServiceProxy, id: string): Promise<boolean> {
  const result = await db.select({
    sql: `SELECT 1 FROM help_desk_migrations WHERE id = ?`,
    params: [id],
  });
  return result.rows.length > 0;
}

async function markMigration(db: AppDatabaseServiceProxy, id: string, description: string): Promise<void> {
  await db.executeRaw({
    sql: `INSERT INTO help_desk_migrations (id, description, applied_at) VALUES (?, ?, datetime('now'))`,
    params: [id, description],
  });
}

export async function runHelpDeskDbBootstrap(db: AppDatabaseServiceProxy): Promise<void> {
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS help_desk_migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT
    )`,
    params: [],
  });

  ensureHelpDeskCoreSchema(db.getDb());

  if (!(await hasMigration(db, MIGRATION_TICKETS))) {
    await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_id TEXT,
      requester_lab_user_id INTEGER,
      requester_email TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
      params: [],
    });

    await markMigration(db, MIGRATION_TICKETS, 'Create tickets table for help desk');
  }

  if (!(await hasMigration(db, MIGRATION_KANBAN_BOARDS))) {
    await db.executeRaw({
      sql: `CREATE TABLE IF NOT EXISTS kanban_boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        field_key TEXT NOT NULL CHECK(field_key IN ('status', 'priority', 'assigneeId')),
        columns_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      params: [],
    });
    await markMigration(db, MIGRATION_KANBAN_BOARDS, 'Kanban boards for custom ticket views');
  }

  await KanbanBoardService.getInstance().seedDefaultsIfEmpty();
}
