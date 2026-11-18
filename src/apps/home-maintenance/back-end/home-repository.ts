/**
 * Home Maintenance data layer — home assets + maintenance tasks.
 */
import type { Database } from 'better-sqlite3';
import type {
  AssetWithTasks,
  HomeAsset,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTask,
  UpsertAssetInput,
  UpsertMaintenanceTaskInput,
} from '../shared/types';

interface AssetRow {
  id: number;
  name: string;
  category: string;
  location: string;
  notes: string;
  created_at: string;
}

interface TaskRow {
  id: number;
  asset_id: number;
  title: string;
  due_date: string;
  status: string;
  priority: string;
  completed_at: string | null;
  notes: string;
  cost: number | null;
}

function ensureTaskCostColumn(db: Database): void {
  const cols = db.prepare(`PRAGMA table_info(home_maintenance_tasks)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === 'cost')) {
    db.exec(`ALTER TABLE home_maintenance_tasks ADD COLUMN cost REAL`);
  }
}

export function bootstrapHomeTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS home_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS home_maintenance_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled',
      priority TEXT NOT NULL DEFAULT 'normal',
      completed_at TEXT,
      notes TEXT NOT NULL DEFAULT '',
      cost REAL
    );
    CREATE INDEX IF NOT EXISTS idx_home_tasks_asset ON home_maintenance_tasks (asset_id);
  `);
  ensureTaskCostColumn(db);
}

function mapAsset(row: AssetRow): HomeAsset {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow, assetName?: string): MaintenanceTask {
  return {
    id: row.id,
    assetId: row.asset_id,
    assetName,
    title: row.title,
    dueDate: row.due_date,
    status: row.status as MaintenanceStatus,
    priority: row.priority as MaintenancePriority,
    completedAt: row.completed_at,
    notes: row.notes,
    cost: row.cost ?? null,
  };
}

export class HomeMaintenanceRepository {
  constructor(private readonly db: Database) {}

  list(): AssetWithTasks[] {
    const assets = this.db.prepare(`SELECT * FROM home_assets ORDER BY created_at DESC, id DESC`).all() as AssetRow[];
    const byAsset = new Map<number, MaintenanceTask[]>();
    for (const row of this.db
      .prepare(`SELECT * FROM home_maintenance_tasks ORDER BY due_date ASC, id ASC`)
      .all() as TaskRow[]) {
      const t = mapTask(row);
      const list = byAsset.get(t.assetId) ?? [];
      list.push(t);
      byAsset.set(t.assetId, list);
    }
    return assets.map((a) => ({
      ...mapAsset(a),
      tasks: (byAsset.get(a.id) ?? []).map((t) => ({ ...t, assetName: a.name })),
    }));
  }

  createAsset(input: UpsertAssetInput): HomeAsset {
    const info = this.db
      .prepare(`INSERT INTO home_assets (name, category, location, notes) VALUES (?, ?, ?, ?)`)
      .run(input.name.trim(), input.category.trim(), input.location.trim(), input.notes.trim());
    return mapAsset(this.db.prepare(`SELECT * FROM home_assets WHERE id = ?`).get(info.lastInsertRowid) as AssetRow);
  }

  updateAsset(id: number, input: UpsertAssetInput): HomeAsset | null {
    if (!this.db.prepare(`SELECT id FROM home_assets WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE home_assets SET name = ?, category = ?, location = ?, notes = ? WHERE id = ?`)
      .run(input.name.trim(), input.category.trim(), input.location.trim(), input.notes.trim(), id);
    return mapAsset(this.db.prepare(`SELECT * FROM home_assets WHERE id = ?`).get(id) as AssetRow);
  }

  deleteAsset(id: number): boolean {
    this.db.prepare(`DELETE FROM home_maintenance_tasks WHERE asset_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM home_assets WHERE id = ?`).run(id).changes > 0;
  }

  addTask(input: UpsertMaintenanceTaskInput): MaintenanceTask {
    const cost = input.cost ?? null;
    const info = this.db
      .prepare(
        `INSERT INTO home_maintenance_tasks (asset_id, title, due_date, priority, notes, cost) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.assetId, input.title.trim(), input.dueDate, input.priority, input.notes.trim(), cost);
    return mapTask(
      this.db.prepare(`SELECT * FROM home_maintenance_tasks WHERE id = ?`).get(info.lastInsertRowid) as TaskRow,
    );
  }

  updateTask(id: number, input: UpsertMaintenanceTaskInput): MaintenanceTask | null {
    if (!this.db.prepare(`SELECT id FROM home_maintenance_tasks WHERE id = ?`).get(id)) return null;
    const cost = input.cost ?? null;
    this.db
      .prepare(
        `UPDATE home_maintenance_tasks SET asset_id = ?, title = ?, due_date = ?, priority = ?, notes = ?, cost = ? WHERE id = ?`,
      )
      .run(input.assetId, input.title.trim(), input.dueDate, input.priority, input.notes.trim(), cost, id);
    return mapTask(this.db.prepare(`SELECT * FROM home_maintenance_tasks WHERE id = ?`).get(id) as TaskRow);
  }

  setTaskStatus(id: number, status: MaintenanceStatus): MaintenanceTask | null {
    if (!this.db.prepare(`SELECT id FROM home_maintenance_tasks WHERE id = ?`).get(id)) return null;
    const completedAt = status === 'done' ? new Date().toISOString() : null;
    this.db
      .prepare(`UPDATE home_maintenance_tasks SET status = ?, completed_at = ? WHERE id = ?`)
      .run(status, completedAt, id);
    return mapTask(this.db.prepare(`SELECT * FROM home_maintenance_tasks WHERE id = ?`).get(id) as TaskRow);
  }

  deleteTask(id: number): boolean {
    return this.db.prepare(`DELETE FROM home_maintenance_tasks WHERE id = ?`).run(id).changes > 0;
  }
}
