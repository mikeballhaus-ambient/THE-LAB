/**
 * Project Charter data layer — single-entity CRUD in the app's own SQLite DB.
 */
import type { Database } from 'better-sqlite3';
import type { Charter, CharterStatus, UpsertCharterInput } from '../shared/types';
import { ensureTextColumn } from '@/shared/server/demo-seed-columns';

interface CharterRow {
  id: number;
  title: string;
  sponsor: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  sponsor_id?: number | null;
  purpose: string;
  scope: string;
  out_of_scope: string;
  stakeholders: string;
  /** JSON array of platform user ids for Forms Builder multiselect. */
  stakeholder_user_ids?: string | null;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  stakeholders_owner_id?: number | null;
  goals: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function bootstrapCharterTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS charters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sponsor TEXT NOT NULL DEFAULT '',
      purpose TEXT NOT NULL DEFAULT '',
      scope TEXT NOT NULL DEFAULT '',
      out_of_scope TEXT NOT NULL DEFAULT '',
      stakeholders TEXT NOT NULL DEFAULT '',
      goals TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureTextColumn(db, 'charters', 'stakeholder_user_ids', '[]');
}

function mapCharter(row: CharterRow): Charter {
  return {
    id: row.id,
    title: row.title,
    sponsor: row.sponsor,
    sponsorId: row.sponsor_id ?? null,
    purpose: row.purpose,
    scope: row.scope,
    outOfScope: row.out_of_scope,
    stakeholders: row.stakeholders,
    stakeholderUserIds: row.stakeholder_user_ids ?? '[]',
    stakeholdersOwnerId: row.stakeholders_owner_id ?? null,
    goals: row.goals,
    status: row.status as CharterStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CharterRepository {
  constructor(private readonly db: Database) {}

  list(): Charter[] {
    return (
      this.db.prepare(`SELECT * FROM charters ORDER BY updated_at DESC, id DESC`).all() as CharterRow[]
    ).map(mapCharter);
  }

  create(input: UpsertCharterInput): Charter {
    const info = this.db
      .prepare(
        `INSERT INTO charters (title, sponsor, sponsor_id, purpose, scope, out_of_scope,
           stakeholders, stakeholder_user_ids, stakeholders_owner_id, goals, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title.trim(),
        input.sponsor.trim(),
        input.sponsorId ?? null,
        input.purpose.trim(),
        input.scope.trim(),
        input.outOfScope.trim(),
        input.stakeholders.trim(),
        input.stakeholderUserIds ?? '[]',
        input.stakeholdersOwnerId ?? null,
        input.goals.trim(),
        input.status,
      );
    return mapCharter(
      this.db.prepare(`SELECT * FROM charters WHERE id = ?`).get(info.lastInsertRowid) as CharterRow,
    );
  }

  update(id: number, input: UpsertCharterInput): Charter | null {
    if (!this.db.prepare(`SELECT id FROM charters WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE charters SET title = ?, sponsor = ?, sponsor_id = ?, purpose = ?, scope = ?,
         out_of_scope = ?, stakeholders = ?, stakeholder_user_ids = ?, stakeholders_owner_id = ?, goals = ?, status = ?,
         updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.sponsor.trim(),
        input.sponsorId ?? null,
        input.purpose.trim(),
        input.scope.trim(),
        input.outOfScope.trim(),
        input.stakeholders.trim(),
        input.stakeholderUserIds ?? '[]',
        input.stakeholdersOwnerId ?? null,
        input.goals.trim(),
        input.status,
        id,
      );
    return mapCharter(this.db.prepare(`SELECT * FROM charters WHERE id = ?`).get(id) as CharterRow);
  }

  delete(id: number): boolean {
    return this.db.prepare(`DELETE FROM charters WHERE id = ?`).run(id).changes > 0;
  }
}
