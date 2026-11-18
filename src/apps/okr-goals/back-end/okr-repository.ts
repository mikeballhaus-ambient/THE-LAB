/**
 * OKR / Goals data layer — objectives + key results in the app's SQLite DB.
 */
import type { Database } from 'better-sqlite3';
import type {
  KeyResult,
  KeyResultStatus,
  Objective,
  ObjectiveWithKeyResults,
  UpsertKeyResultInput,
  UpsertObjectiveInput,
} from '../shared/types';

interface ObjectiveRow {
  id: number;
  title: string;
  owner_name: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  owner_id?: number | null;
  quarter: string;
  created_at: string;
}

interface KeyResultRow {
  id: number;
  objective_id: number;
  title: string;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  status: string;
  order: number;
}

export function bootstrapOkrTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS okr_objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner_name TEXT NOT NULL DEFAULT '',
      quarter TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS okr_key_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      objective_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      metric TEXT NOT NULL DEFAULT '',
      baseline REAL NOT NULL DEFAULT 0,
      target REAL NOT NULL DEFAULT 100,
      current REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'not-started',
      "order" INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_okr_kr_objective ON okr_key_results (objective_id);
  `);
}

function mapObjective(row: ObjectiveRow): Objective {
  return {
    id: row.id,
    title: row.title,
    ownerName: row.owner_name,
    ownerId: row.owner_id ?? null,
    quarter: row.quarter,
    createdAt: row.created_at,
  };
}

function mapKeyResult(row: KeyResultRow): KeyResult {
  return {
    id: row.id,
    objectiveId: row.objective_id,
    title: row.title,
    metric: row.metric,
    baseline: row.baseline,
    target: row.target,
    current: row.current,
    status: row.status as KeyResultStatus,
    order: row.order,
  };
}

/** Progress 0–100 for a single KR (clamped), derived from baseline→target. */
export function keyResultProgress(kr: KeyResult): number {
  const span = kr.target - kr.baseline;
  if (span === 0) {
    return kr.status === 'done' ? 100 : 0;
  }
  const pct = ((kr.current - kr.baseline) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function averageProgress(krs: KeyResult[]): number {
  if (krs.length === 0) {
    return 0;
  }
  return Math.round(krs.reduce((sum, kr) => sum + keyResultProgress(kr), 0) / krs.length);
}

export class OkrRepository {
  constructor(private readonly db: Database) {}

  listObjectives(): ObjectiveWithKeyResults[] {
    const objectives = this.db
      .prepare(`SELECT * FROM okr_objectives ORDER BY created_at DESC, id DESC`)
      .all() as ObjectiveRow[];
    const krsByObjective = new Map<number, KeyResult[]>();
    for (const row of this.db
      .prepare(`SELECT * FROM okr_key_results ORDER BY "order" ASC, id ASC`)
      .all() as KeyResultRow[]) {
      const kr = mapKeyResult(row);
      const list = krsByObjective.get(kr.objectiveId) ?? [];
      list.push(kr);
      krsByObjective.set(kr.objectiveId, list);
    }
    return objectives.map((o) => {
      const keyResults = krsByObjective.get(o.id) ?? [];
      return { ...mapObjective(o), keyResults, progress: averageProgress(keyResults) };
    });
  }

  createObjective(input: UpsertObjectiveInput): Objective {
    const info = this.db
      .prepare(`INSERT INTO okr_objectives (title, owner_name, owner_id, quarter) VALUES (?, ?, ?, ?)`)
      .run(
        input.title.trim(),
        input.ownerName.trim(),
        input.ownerId ?? null,
        input.quarter.trim(),
      );
    return mapObjective(
      this.db.prepare(`SELECT * FROM okr_objectives WHERE id = ?`).get(info.lastInsertRowid) as ObjectiveRow,
    );
  }

  updateObjective(id: number, input: UpsertObjectiveInput): Objective | null {
    if (!this.db.prepare(`SELECT id FROM okr_objectives WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE okr_objectives SET title = ?, owner_name = ?, owner_id = ?, quarter = ? WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.ownerName.trim(),
        input.ownerId ?? null,
        input.quarter.trim(),
        id,
      );
    return mapObjective(
      this.db.prepare(`SELECT * FROM okr_objectives WHERE id = ?`).get(id) as ObjectiveRow,
    );
  }

  deleteObjective(id: number): boolean {
    this.db.prepare(`DELETE FROM okr_key_results WHERE objective_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM okr_objectives WHERE id = ?`).run(id).changes > 0;
  }

  createKeyResult(input: UpsertKeyResultInput): KeyResult {
    const info = this.db
      .prepare(
        `INSERT INTO okr_key_results (objective_id, title, metric, baseline, target, current, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.objectiveId,
        input.title.trim(),
        input.metric.trim(),
        input.baseline,
        input.target,
        input.current,
        input.status,
      );
    return mapKeyResult(
      this.db.prepare(`SELECT * FROM okr_key_results WHERE id = ?`).get(info.lastInsertRowid) as KeyResultRow,
    );
  }

  updateKeyResult(id: number, input: UpsertKeyResultInput): KeyResult | null {
    if (!this.db.prepare(`SELECT id FROM okr_key_results WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE okr_key_results SET objective_id = ?, title = ?, metric = ?, baseline = ?, target = ?, current = ?, status = ? WHERE id = ?`,
      )
      .run(
        input.objectiveId,
        input.title.trim(),
        input.metric.trim(),
        input.baseline,
        input.target,
        input.current,
        input.status,
        id,
      );
    return mapKeyResult(
      this.db.prepare(`SELECT * FROM okr_key_results WHERE id = ?`).get(id) as KeyResultRow,
    );
  }

  deleteKeyResult(id: number): boolean {
    return this.db.prepare(`DELETE FROM okr_key_results WHERE id = ?`).run(id).changes > 0;
  }
}
