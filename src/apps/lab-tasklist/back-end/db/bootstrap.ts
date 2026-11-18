import { AppDatabaseServiceProxy } from '../../db/app-db-service';

const MIGRATION_CORE_TABLES = 'v0_task_list_core_tables';
const MIGRATION_APP_ID_COLUMN = 'v1_task_lists_app_id';
const MIGRATION_TASKS_METADATA = 'v2_tasks_metadata';

async function columnExists(
  db: AppDatabaseServiceProxy,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await db.select({
    sql: `PRAGMA table_info(${table})`,
    params: [],
  });
  return result.rows.some((row) => String((row as Record<string, unknown>).name) === column);
}

async function hasMigration(db: AppDatabaseServiceProxy, name: string): Promise<boolean> {
  const result = await db.select({
    sql: 'SELECT 1 FROM task_list_migrations WHERE migration_name = ? LIMIT 1',
    params: [name],
  });
  return result.rows.length > 0;
}

async function markMigration(db: AppDatabaseServiceProxy, name: string, description: string): Promise<void> {
  await db.executeRaw({
    sql: 'INSERT INTO task_list_migrations (migration_name, description) VALUES (?, ?)',
    params: [name, description],
  });
}

/**
 * App DB migrations for task-list (runs on server startup after proxy initialize).
 */
async function ensureCoreTaskListTables(db: AppDatabaseServiceProxy): Promise<void> {
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      assignee_id TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    params: [],
  });
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS task_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      app_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    params: [],
  });
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS task_list_tasks (
      task_list_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      UNIQUE(task_list_id, task_id)
    )`,
    params: [],
  });
}

export async function runTaskListDbBootstrap(db: AppDatabaseServiceProxy): Promise<void> {
  await db.executeRaw({
    sql: `CREATE TABLE IF NOT EXISTS task_list_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    params: [],
  });

  await ensureCoreTaskListTables(db);
  if (!(await hasMigration(db, MIGRATION_CORE_TABLES))) {
    await markMigration(
      db,
      MIGRATION_CORE_TABLES,
      'Ensure tasks, task_lists, and task_list_tasks exist (idempotent CREATE IF NOT EXISTS)',
    );
  }

  if (!(await hasMigration(db, MIGRATION_APP_ID_COLUMN))) {
    if (!(await columnExists(db, 'task_lists', 'app_id'))) {
      await db.executeRaw({
        sql: 'ALTER TABLE task_lists ADD COLUMN app_id TEXT NULL',
        params: [],
      });
    }
    await markMigration(
      db,
      MIGRATION_APP_ID_COLUMN,
      'Add task_lists.app_id for host-app isolation (NULL = Task List app)',
    );
  }

  if (!(await hasMigration(db, MIGRATION_TASKS_METADATA))) {
    if (!(await columnExists(db, 'tasks', 'metadata'))) {
      await db.executeRaw({
        sql: 'ALTER TABLE tasks ADD COLUMN metadata TEXT NULL',
        params: [],
      });
    }
    await markMigration(
      db,
      MIGRATION_TASKS_METADATA,
      'Add tasks.metadata TEXT for host-app JSON context (e.g. CRM entity linkage)',
    );
  }
}
