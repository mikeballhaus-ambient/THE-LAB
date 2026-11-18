/**
 * Job Applicant Tracker data layer — candidates pipeline in the app's SQLite DB.
 */
import type { Database } from 'better-sqlite3';
import type { Applicant, HiringStage, UpsertApplicantInput } from '../shared/types';

interface ApplicantRow {
  id: number;
  name: string;
  role: string;
  email: string;
  stage: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function bootstrapApplicantTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL DEFAULT 'applied',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function mapApplicant(row: ApplicantRow): Applicant {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    stage: row.stage as HiringStage,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ApplicantRepository {
  constructor(private readonly db: Database) {}

  list(): Applicant[] {
    return (
      this.db.prepare(`SELECT * FROM applicants ORDER BY updated_at DESC, id DESC`).all() as ApplicantRow[]
    ).map(mapApplicant);
  }

  create(input: UpsertApplicantInput): Applicant {
    const info = this.db
      .prepare(`INSERT INTO applicants (name, role, email, stage, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(
        input.name.trim(),
        input.role.trim(),
        input.email.trim(),
        input.stage,
        input.notes.trim(),
      );
    return mapApplicant(
      this.db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(info.lastInsertRowid) as ApplicantRow,
    );
  }

  update(id: number, input: UpsertApplicantInput): Applicant | null {
    if (!this.db.prepare(`SELECT id FROM applicants WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE applicants SET name = ?, role = ?, email = ?, stage = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        input.name.trim(),
        input.role.trim(),
        input.email.trim(),
        input.stage,
        input.notes.trim(),
        id,
      );
    return mapApplicant(this.db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(id) as ApplicantRow);
  }

  setStage(id: number, stage: HiringStage): Applicant | null {
    if (!this.db.prepare(`SELECT id FROM applicants WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE applicants SET stage = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(stage, id);
    return mapApplicant(this.db.prepare(`SELECT * FROM applicants WHERE id = ?`).get(id) as ApplicantRow);
  }

  delete(id: number): boolean {
    return this.db.prepare(`DELETE FROM applicants WHERE id = ?`).run(id).changes > 0;
  }
}
