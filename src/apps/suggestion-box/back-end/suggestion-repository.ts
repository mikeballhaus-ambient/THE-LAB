/**
 * Suggestion Box data layer — suggestions + upvotes in the app's SQLite DB.
 */
import type { Database } from 'better-sqlite3';
import type { Suggestion, SuggestionStatus, UpsertSuggestionInput } from '../shared/types';

interface SuggestionRow {
  id: number;
  title: string;
  body: string;
  author: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  author_id?: number | null;
  status: string;
  votes: number;
  created_at: string;
  updated_at: string;
}

export function bootstrapSuggestionTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      votes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function mapSuggestion(row: SuggestionRow): Suggestion {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    author: row.author,
    authorId: row.author_id ?? null,
    status: row.status as SuggestionStatus,
    votes: row.votes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SuggestionRepository {
  constructor(private readonly db: Database) {}

  list(): Suggestion[] {
    return (
      this.db
        .prepare(`SELECT * FROM suggestions ORDER BY votes DESC, created_at DESC, id DESC`)
        .all() as SuggestionRow[]
    ).map(mapSuggestion);
  }

  create(input: UpsertSuggestionInput): Suggestion {
    const info = this.db
      .prepare(
        `INSERT INTO suggestions (title, body, author, author_id, status) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.title.trim(),
        input.body.trim(),
        input.author.trim(),
        input.authorId ?? null,
        input.status ?? 'open',
      );
    return mapSuggestion(
      this.db.prepare(`SELECT * FROM suggestions WHERE id = ?`).get(info.lastInsertRowid) as SuggestionRow,
    );
  }

  update(id: number, input: UpsertSuggestionInput): Suggestion | null {
    if (!this.db.prepare(`SELECT id FROM suggestions WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE suggestions SET title = ?, body = ?, author = ?, author_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.body.trim(),
        input.author.trim(),
        input.authorId ?? null,
        input.status,
        id,
      );
    return mapSuggestion(this.db.prepare(`SELECT * FROM suggestions WHERE id = ?`).get(id) as SuggestionRow);
  }

  vote(id: number, delta: number): Suggestion | null {
    if (!this.db.prepare(`SELECT id FROM suggestions WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE suggestions SET votes = votes + ?, updated_at = datetime('now') WHERE id = ?`)
      .run(delta, id);
    return mapSuggestion(this.db.prepare(`SELECT * FROM suggestions WHERE id = ?`).get(id) as SuggestionRow);
  }

  delete(id: number): boolean {
    return this.db.prepare(`DELETE FROM suggestions WHERE id = ?`).run(id).changes > 0;
  }
}
