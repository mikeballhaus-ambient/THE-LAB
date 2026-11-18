import type { Database } from 'better-sqlite3';
import {
  APP_SEED_BOOT_FLAG_KEYS,
  isAppSeedBootDisabled,
  setAppSeedBootDisabled,
} from '@/shared/config/app-seed-boot-flags';
import { demoCastIdForName } from '@/shared/config/demo-data-cast';
import { CRM_APP_REGISTRY_ID } from '../../shared/constants/app-scope';

export const TASK_LIST_DEMO_PACK_ID = 'task-list-demo';
const SEED_METADATA = JSON.stringify({ seedPack: TASK_LIST_DEMO_PACK_ID, schemaVersion: 1 });

export const DEMO_TASK_LIST_NAMES = ['Demo sprint', 'Work', 'Personal'] as const;

export const DEMO_TASK_LIST_DESCRIPTIONS: Record<(typeof DEMO_TASK_LIST_NAMES)[number], string> = {
  'Demo sprint': 'Sprint goals, demos, and training exercises for THE-LAB.',
  Work: 'Day-to-day work items and team follow-ups.',
  Personal: 'Personal reminders, errands, and learning tasks.',
};

export function demoTaskListDescriptionForName(name: string): string {
  if ((DEMO_TASK_LIST_NAMES as readonly string[]).includes(name)) {
    return DEMO_TASK_LIST_DESCRIPTIONS[name as (typeof DEMO_TASK_LIST_NAMES)[number]];
  }
  return `Demo list (${TASK_LIST_DEMO_PACK_ID})`;
}

export const DEMO_TASK_SEED_DESCRIPTION = 'Seeded demo task for THE-LAB training.';

export const DEMO_TASK_TITLES = [
  'Finalize Q4 roadmap',
  'Review CRM dashboard charts',
  'Sync with support on ticket backlog',
  'Prepare sprint demo',
  'Update team wiki',
  'Code review: task list reports',
  'Book travel for conference',
  'Renew SSL certificates',
  'Organize lab onboarding doc',
] as const;

/** Host-scoped lists (`task_lists.app_id` set) — hidden from Task List app native scope. */
export const DEMO_SCOPED_HOST_LISTS = [
  {
    appId: CRM_APP_REGISTRY_ID,
    name: 'CRM Tasks',
    description: `Default task list for CRM (demo ${TASK_LIST_DEMO_PACK_ID})`,
  },
] as const;

export const DEMO_CRM_TASK_TITLES = [
  'Follow up: Northwind proposal',
  'Schedule Summit Health check-in',
  'Refresh pipeline stage notes',
] as const;

function isDemoListDescription(description: string | null | undefined): boolean {
  return Boolean(description?.includes(`(${TASK_LIST_DEMO_PACK_ID})`));
}

/**
 * `tasks.assignee_id` exists in the app DB but not in every test fixture or pre-migration
 * install, so the insert branches on it rather than failing.
 */
function hasAssigneeColumn(db: Database): boolean {
  try {
    const rows = db.prepare('PRAGMA table_info(tasks)').all() as { name: string }[];
    return rows.some((row) => row.name === 'assignee_id');
  } catch {
    return false;
  }
}

function hasTaskListAppIdColumn(db: Database): boolean {
  try {
    const rows = db.prepare('PRAGMA table_info(task_lists)').all() as { name: string }[];
    return rows.some((row) => row.name === 'app_id');
  } catch {
    return false;
  }
}

function isNativeTaskListRow(appId: string | null | undefined): boolean {
  return appId == null || appId === '';
}

function buildDemoCrmTaskMetadata(entityKey: string, recordId: number, recordLabel: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    hostAppId: CRM_APP_REGISTRY_ID,
    entityKey,
    recordId,
    recordLabel,
    seedPack: TASK_LIST_DEMO_PACK_ID,
  });
}

/**
 * True when the Task List tables exist.
 *
 * Unlike the Wave C catalog apps (which create their own tables on boot), Task List's
 * `task_lists` / `tasks` schema is part of the app's provisioned database. On a database
 * that has not been provisioned yet, the seed must no-op rather than throw and take the
 * app server down.
 */
function taskListSchemaReady(db: Database): boolean {
  try {
    const rows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('tasks', 'task_lists', 'task_list_tasks')`)
      .all() as { name: string }[];
    return rows.length === 3;
  } catch {
    return false;
  }
}

function taskRowIsDemoSeed(metadata: string | null, description: string | null): boolean {
  if (metadata?.includes(TASK_LIST_DEMO_PACK_ID)) {
    return true;
  }
  return description === DEMO_TASK_SEED_DESCRIPTION;
}

/** True when native (null `app_id`) demo tasks exist. */
export function hasNativeTaskListDemoDataset(db: Database): boolean {
  if (!taskListSchemaReady(db)) {
    return false;
  }
  const rows = db
    .prepare(
      `SELECT t.metadata, t.description
       FROM tasks t
       JOIN task_list_tasks tlt ON tlt.task_id = t.id
       JOIN task_lists tl ON tl.id = tlt.task_list_id
       WHERE tl.app_id IS NULL OR tl.app_id = ''`,
    )
    .all() as { metadata: string | null; description: string | null }[];
  return rows.some((row) => taskRowIsDemoSeed(row.metadata, row.description));
}

/** True when host-scoped demo tasks exist for a given `task_lists.app_id`. */
export function hasScopedHostTaskListDemoDataset(db: Database, hostAppId: string): boolean {
  if (!taskListSchemaReady(db) || !hasTaskListAppIdColumn(db)) {
    return false;
  }
  const row = db
    .prepare(
      `SELECT 1
       FROM tasks t
       JOIN task_list_tasks tlt ON tlt.task_id = t.id
       JOIN task_lists tl ON tl.id = tlt.task_list_id
       WHERE tl.app_id = ?
         AND (t.metadata LIKE ? OR t.description = ?)
       LIMIT 1`,
    )
    .get(hostAppId, `%${TASK_LIST_DEMO_PACK_ID}%`, DEMO_TASK_SEED_DESCRIPTION);
  return Boolean(row);
}

/** True when any demo seed tasks exist (native or host-scoped). */
export function hasTaskListDemoDataset(db: Database): boolean {
  if (!taskListSchemaReady(db)) {
    return false;
  }
  if (
    db.prepare(`SELECT 1 FROM tasks WHERE metadata LIKE ? LIMIT 1`).get(`%${TASK_LIST_DEMO_PACK_ID}%`)
  ) {
    return true;
  }
  return Boolean(
    db
      .prepare(`SELECT 1 FROM tasks WHERE description = ? LIMIT 1`)
      .get(DEMO_TASK_SEED_DESCRIPTION),
  );
}

export interface SeedApplyOptions {
  /** Settings admin Apply — ignores boot suppress flags. */
  adminApply?: boolean;
}

function insertDemoTaskRow(
  db: Database,
  spec: {
    title: string;
    status: string;
    priority: string;
    assigneeName: string;
    metadata: string;
  },
  now: string,
): { taskId: number; inserted: boolean } {
  const existingTask = db
    .prepare(
      `SELECT id FROM tasks WHERE title = ? AND (metadata LIKE ? OR description = ?) LIMIT 1`,
    )
    .get(spec.title, `%${TASK_LIST_DEMO_PACK_ID}%`, DEMO_TASK_SEED_DESCRIPTION) as
    | { id: number }
    | undefined;
  if (existingTask) {
    return { taskId: existingTask.id, inserted: false };
  }
  const taskResult = hasAssigneeColumn(db)
    ? db
        .prepare(
          `INSERT INTO tasks (title, description, status, priority, assignee_id, tags, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
        )
        .run(
          spec.title,
          DEMO_TASK_SEED_DESCRIPTION,
          spec.status,
          spec.priority,
          String(demoCastIdForName(spec.assigneeName)),
          spec.metadata,
          now,
          now,
        )
    : db
        .prepare(
          `INSERT INTO tasks (title, description, status, priority, tags, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, '[]', ?, ?, ?)`,
        )
        .run(
          spec.title,
          DEMO_TASK_SEED_DESCRIPTION,
          spec.status,
          spec.priority,
          spec.metadata,
          now,
          now,
        );
  return { taskId: Number(taskResult.lastInsertRowid), inserted: true };
}

/** Refresh native demo list copy when rows still use the generic pack label. */
function refreshNativeDemoListDescriptions(db: Database, now: string): void {
  const generic = `Demo list (${TASK_LIST_DEMO_PACK_ID})`;
  for (const name of DEMO_TASK_LIST_NAMES) {
    db.prepare(
      `UPDATE task_lists SET description = ?, updated_at = ?
       WHERE name = ? AND (app_id IS NULL OR app_id = '')
         AND (description IS NULL OR description = '' OR description = ?)`,
    ).run(demoTaskListDescriptionForName(name), now, name, generic);
  }
}

function linkTaskToList(db: Database, listId: number, taskId: number): void {
  const linkExists = db
    .prepare(`SELECT 1 FROM task_list_tasks WHERE task_list_id = ? AND task_id = ? LIMIT 1`)
    .get(listId, taskId);
  if (!linkExists) {
    db.prepare(`INSERT INTO task_list_tasks (task_list_id, task_id) VALUES (?, ?)`).run(listId, taskId);
  }
}

function seedNativeDemoTasks(
  db: Database,
  now: string,
): { insertedLists: number; insertedTasks: number } {
  refreshNativeDemoListDescriptions(db, now);
  if (hasNativeTaskListDemoDataset(db)) {
    return { insertedLists: 0, insertedTasks: 0 };
  }

  let insertedLists = 0;
  let insertedTasks = 0;

  const listIds: number[] = [];
  for (const name of DEMO_TASK_LIST_NAMES) {
    const existing = db
      .prepare(
        `SELECT id FROM task_lists WHERE name = ? AND (app_id IS NULL OR app_id = '') LIMIT 1`,
      )
      .get(name) as { id: number } | undefined;
    if (existing) {
      listIds.push(existing.id);
      continue;
    }
    const result = db
      .prepare(
        `INSERT INTO task_lists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      )
      .run(name, demoTaskListDescriptionForName(name), now, now);
    listIds.push(Number(result.lastInsertRowid));
    insertedLists += 1;
  }

  const taskSpecs: {
    listIndex: number;
    title: string;
    status: string;
    priority: string;
    assigneeName: string;
  }[] = [
    { listIndex: 0, title: DEMO_TASK_TITLES[0], status: 'in_progress', priority: 'high', assigneeName: 'Mia Chen' },
    { listIndex: 0, title: DEMO_TASK_TITLES[1], status: 'pending', priority: 'medium', assigneeName: 'Mia Chen' },
    { listIndex: 0, title: DEMO_TASK_TITLES[2], status: 'pending', priority: 'low', assigneeName: 'Sam Patel' },
    { listIndex: 1, title: DEMO_TASK_TITLES[3], status: 'in_progress', priority: 'urgent', assigneeName: 'Jordan Lee' },
    { listIndex: 1, title: DEMO_TASK_TITLES[4], status: 'completed', priority: 'low', assigneeName: 'Casey Hayes' },
    { listIndex: 1, title: DEMO_TASK_TITLES[5], status: 'pending', priority: 'medium', assigneeName: 'Riley Brooks' },
    { listIndex: 2, title: DEMO_TASK_TITLES[6], status: 'pending', priority: 'low', assigneeName: 'Drew Ward' },
    { listIndex: 2, title: DEMO_TASK_TITLES[7], status: 'pending', priority: 'high', assigneeName: 'Blake Torres' },
    { listIndex: 2, title: DEMO_TASK_TITLES[8], status: 'completed', priority: 'medium', assigneeName: 'Cameron Foster' },
  ];

  for (const spec of taskSpecs) {
    const { taskId, inserted } = insertDemoTaskRow(
      db,
      { ...spec, metadata: SEED_METADATA },
      now,
    );
    if (inserted) {
      insertedTasks += 1;
    }
    linkTaskToList(db, listIds[spec.listIndex], taskId);
  }

  return { insertedLists, insertedTasks };
}

function seedScopedHostDemoTasks(
  db: Database,
  now: string,
): { insertedLists: number; insertedTasks: number } {
  if (!hasTaskListAppIdColumn(db)) {
    return { insertedLists: 0, insertedTasks: 0 };
  }

  let insertedLists = 0;
  let insertedTasks = 0;

  for (const hostList of DEMO_SCOPED_HOST_LISTS) {
    if (hasScopedHostTaskListDemoDataset(db, hostList.appId)) {
      continue;
    }

    const existing = db
      .prepare(`SELECT id FROM task_lists WHERE name = ? AND app_id = ? LIMIT 1`)
      .get(hostList.name, hostList.appId) as { id: number } | undefined;
    let listId: number;
    if (existing) {
      listId = existing.id;
    } else {
      const result = db
        .prepare(
          `INSERT INTO task_lists (name, description, app_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(hostList.name, hostList.description, hostList.appId, now, now);
      listId = Number(result.lastInsertRowid);
      insertedLists += 1;
    }

    if (hostList.appId !== CRM_APP_REGISTRY_ID) {
      continue;
    }

    const crmTaskSpecs = [
      {
        title: DEMO_CRM_TASK_TITLES[0],
        status: 'pending',
        priority: 'high',
        assigneeName: 'Jordan Lee',
        metadata: buildDemoCrmTaskMetadata('sales', 1, 'Northwind Labs — platform negotiation'),
      },
      {
        title: DEMO_CRM_TASK_TITLES[1],
        status: 'in_progress',
        priority: 'medium',
        assigneeName: 'Mia Chen',
        metadata: buildDemoCrmTaskMetadata('contacts', 1, 'Avery Chen — Summit Health'),
      },
      {
        title: DEMO_CRM_TASK_TITLES[2],
        status: 'pending',
        priority: 'low',
        assigneeName: 'Riley Brooks',
        metadata: buildDemoCrmTaskMetadata('leads', 1, 'Summit Health — working lead'),
      },
    ];

    for (const spec of crmTaskSpecs) {
      const { taskId, inserted } = insertDemoTaskRow(db, spec, now);
      if (inserted) {
        insertedTasks += 1;
      }
      linkTaskToList(db, listId, taskId);
    }
  }

  return { insertedLists, insertedTasks };
}

export function seedDemoTasksIfMissing(
  db: Database,
  options?: SeedApplyOptions,
): { insertedLists: number; insertedTasks: number } {
  if (!options?.adminApply && isAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO)) {
    return { insertedLists: 0, insertedTasks: 0 };
  }
  if (!taskListSchemaReady(db)) {
    return { insertedLists: 0, insertedTasks: 0 };
  }

  const now = new Date().toISOString();
  const native = seedNativeDemoTasks(db, now);
  const scoped = seedScopedHostDemoTasks(db, now);

  return {
    insertedLists: native.insertedLists + scoped.insertedLists,
    insertedTasks: native.insertedTasks + scoped.insertedTasks,
  };
}

function collectDemoTaskIds(db: Database): number[] {
  const ids = new Set<number>();
  const byMetadata = db
    .prepare(`SELECT id FROM tasks WHERE metadata LIKE ?`)
    .all(`%${TASK_LIST_DEMO_PACK_ID}%`) as { id: number }[];
  for (const { id } of byMetadata) {
    ids.add(id);
  }
  const byDescription = db
    .prepare(`SELECT id FROM tasks WHERE description = ?`)
    .all(DEMO_TASK_SEED_DESCRIPTION) as { id: number }[];
  for (const { id } of byDescription) {
    ids.add(id);
  }
  for (const title of [...DEMO_TASK_TITLES, ...DEMO_CRM_TASK_TITLES]) {
    const rows = db
      .prepare(
        `SELECT id FROM tasks WHERE title = ? AND (metadata LIKE ? OR description = ?)`,
      )
      .all(title, `%${TASK_LIST_DEMO_PACK_ID}%`, DEMO_TASK_SEED_DESCRIPTION) as { id: number }[];
    for (const { id } of rows) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function countDemoTasks(db: Database): number {
  return collectDemoTaskIds(db).length;
}

/** Wipe all task lists and tasks (greenfield / integration pilot). Suppresses auto demo seed on boot. */
export function clearAllTaskListsAndTasks(db: Database): {
  removedTasks: number;
  removedLists: number;
} {
  const listRow = db.prepare('SELECT COUNT(*) AS c FROM task_lists').get() as { c: number };
  const taskRow = db.prepare('SELECT COUNT(*) AS c FROM tasks').get() as { c: number };
  db.prepare('DELETE FROM task_list_tasks').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM task_lists').run();
  setAppSeedBootDisabled(db, APP_SEED_BOOT_FLAG_KEYS.TASK_LIST_DEMO, true);
  return { removedTasks: taskRow.c, removedLists: listRow.c };
}

/** Remove only seed-pack tasks and empty demo lists; user-created rows are kept. */
export function removeDemoTasks(db: Database): { removedTasks: number; removedLists: number } {
  const taskIds = collectDemoTaskIds(db);
  let removedTasks = 0;
  for (const id of taskIds) {
    db.prepare('DELETE FROM task_list_tasks WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    removedTasks += 1;
  }
  let removedLists = 0;
  const listRows = db
    .prepare(`SELECT id, name, description, app_id FROM task_lists`)
    .all() as { id: number; name: string; description: string | null; app_id: string | null }[];
  for (const list of listRows) {
    const isMarkedDemoList = isDemoListDescription(list.description);
    const isNamedDemoList =
      (DEMO_TASK_LIST_NAMES as readonly string[]).includes(list.name) &&
      isNativeTaskListRow(list.app_id);
    const isScopedDemoList = DEMO_SCOPED_HOST_LISTS.some(
      (spec) =>
        spec.name === list.name &&
        list.description === spec.description &&
        list.app_id === spec.appId,
    );
    if (!isMarkedDemoList && !isNamedDemoList && !isScopedDemoList) {
      continue;
    }
    const remaining = db
      .prepare('SELECT COUNT(*) AS c FROM task_list_tasks WHERE task_list_id = ?')
      .get(list.id) as { c: number };
    if (remaining.c === 0) {
      db.prepare('DELETE FROM task_lists WHERE id = ?').run(list.id);
      removedLists += 1;
    }
  }
  return { removedTasks, removedLists };
}
