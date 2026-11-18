/**
 * Onboarding Checklist data layer — checklists + tasks with derived progress.
 */
import type { Database } from 'better-sqlite3';
import { columnExists } from '@/shared/server/demo-seed-columns';
import type {
  Checklist,
  ChecklistTask,
  ChecklistWithTasks,
  TaskStatus,
  UpsertChecklistInput,
  UpsertTaskInput,
} from '../shared/types';

interface ChecklistRow {
  id: number;
  new_hire: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  new_hire_id?: number | null;
  role: string;
  start_date: string;
  created_at: string;
}

interface TaskRow {
  id: number;
  checklist_id: number;
  title: string;
  owner: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  owner_id?: number | null;
  due_date?: string | null;
  status: string;
  order: number;
}

export function bootstrapOnboardingTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      new_hire TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      owner TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      "order" INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist ON onboarding_tasks (checklist_id);
  `);
  if (!columnExists(db, 'onboarding_tasks', 'due_date')) {
    db.exec(`ALTER TABLE onboarding_tasks ADD COLUMN due_date TEXT NOT NULL DEFAULT ''`);
  }
}

function mapChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    newHire: row.new_hire,
    newHireId: row.new_hire_id ?? null,
    role: row.role,
    startDate: row.start_date,
    createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow): ChecklistTask {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    title: row.title,
    owner: row.owner,
    ownerId: row.owner_id ?? null,
    dueDate: row.due_date ?? '',
    status: row.status as TaskStatus,
    order: row.order,
  };
}

export class OnboardingRepository {
  constructor(private readonly db: Database) {}

  list(): ChecklistWithTasks[] {
    const checklists = this.db
      .prepare(`SELECT * FROM onboarding_checklists ORDER BY start_date DESC, id DESC`)
      .all() as ChecklistRow[];
    const byChecklist = new Map<number, ChecklistTask[]>();
    for (const row of this.db
      .prepare(`SELECT * FROM onboarding_tasks ORDER BY "order" ASC, id ASC`)
      .all() as TaskRow[]) {
      const t = mapTask(row);
      const list = byChecklist.get(t.checklistId) ?? [];
      list.push(t);
      byChecklist.set(t.checklistId, list);
    }
    return checklists.map((c) => {
      const tasks = byChecklist.get(c.id) ?? [];
      const done = tasks.filter((t) => t.status === 'done').length;
      const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
      return { ...mapChecklist(c), tasks, progress };
    });
  }

  createChecklist(input: UpsertChecklistInput): Checklist {
    const info = this.db
      .prepare(
        `INSERT INTO onboarding_checklists (new_hire, new_hire_id, role, start_date) VALUES (?, ?, ?, ?)`,
      )
      .run(input.newHire.trim(), input.newHireId ?? null, input.role.trim(), input.startDate);
    return mapChecklist(this.db.prepare(`SELECT * FROM onboarding_checklists WHERE id = ?`).get(info.lastInsertRowid) as ChecklistRow);
  }

  updateChecklist(id: number, input: UpsertChecklistInput): Checklist | null {
    if (!this.db.prepare(`SELECT id FROM onboarding_checklists WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE onboarding_checklists SET new_hire = ?, new_hire_id = ?, role = ?, start_date = ? WHERE id = ?`,
      )
      .run(input.newHire.trim(), input.newHireId ?? null, input.role.trim(), input.startDate, id);
    return mapChecklist(this.db.prepare(`SELECT * FROM onboarding_checklists WHERE id = ?`).get(id) as ChecklistRow);
  }

  deleteChecklist(id: number): boolean {
    this.db.prepare(`DELETE FROM onboarding_tasks WHERE checklist_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM onboarding_checklists WHERE id = ?`).run(id).changes > 0;
  }

  addTask(input: UpsertTaskInput): ChecklistTask {
    const nextOrder =
      (
        this.db
          .prepare(`SELECT COALESCE(MAX("order"), -1) + 1 AS n FROM onboarding_tasks WHERE checklist_id = ?`)
          .get(input.checklistId) as { n: number }
      ).n ?? 0;
    const info = this.db
      .prepare(
        `INSERT INTO onboarding_tasks (checklist_id, title, owner, owner_id, due_date, status, "order") VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.checklistId,
        input.title.trim(),
        input.owner.trim(),
        input.ownerId ?? null,
        (input.dueDate ?? '').trim(),
        input.status,
        nextOrder,
      );
    return mapTask(this.db.prepare(`SELECT * FROM onboarding_tasks WHERE id = ?`).get(info.lastInsertRowid) as TaskRow);
  }

  updateTask(id: number, input: UpsertTaskInput): ChecklistTask | null {
    if (!this.db.prepare(`SELECT id FROM onboarding_tasks WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE onboarding_tasks SET checklist_id = ?, title = ?, owner = ?, owner_id = ?, due_date = ?, status = ? WHERE id = ?`,
      )
      .run(
        input.checklistId,
        input.title.trim(),
        input.owner.trim(),
        input.ownerId ?? null,
        (input.dueDate ?? '').trim(),
        input.status,
        id,
      );
    return mapTask(this.db.prepare(`SELECT * FROM onboarding_tasks WHERE id = ?`).get(id) as TaskRow);
  }

  setTaskStatus(id: number, status: TaskStatus): ChecklistTask | null {
    if (!this.db.prepare(`SELECT id FROM onboarding_tasks WHERE id = ?`).get(id)) return null;
    this.db.prepare(`UPDATE onboarding_tasks SET status = ? WHERE id = ?`).run(status, id);
    return mapTask(this.db.prepare(`SELECT * FROM onboarding_tasks WHERE id = ?`).get(id) as TaskRow);
  }

  deleteTask(id: number): boolean {
    return this.db.prepare(`DELETE FROM onboarding_tasks WHERE id = ?`).run(id).changes > 0;
  }
}
