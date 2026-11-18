/**
 * Knowledge Base data layer — articles with categories + full-text-ish search.
 *
 * Every article serves two audiences from one row: `body` is human markdown, `agent_view` is
 * the structured projection used by the KB MCP server. `app_id` links an article to a registry
 * app so the MCP layer can resolve that app's live `app_system_instructions` at call time
 * instead of storing a stale copy.
 */
import type { Database } from 'better-sqlite3';
import type { Article, ArticleStatus, KbAgentView, UpsertArticleInput } from '../shared/types';

interface ArticleRow {
  id: number;
  title: string;
  category: string;
  tags: string;
  body: string;
  status: string;
  author: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  author_id?: number | null;
  /** Added by `ensureDualAudienceColumns`; NULL on rows that predate it. */
  slug?: string | null;
  agent_view?: string | null;
  app_id?: string | null;
  source_path?: string | null;
  created_at: string;
  updated_at: string;
}

export function bootstrapArticleTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      author TEXT NOT NULL DEFAULT '',
      author_id INTEGER,
      slug TEXT,
      agent_view TEXT,
      app_id TEXT,
      source_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureDualAudienceColumns(db);
}

/**
 * Add the dual-audience columns to a database created before they existed.
 *
 * Idempotent and additive: every column is nullable, so existing rows keep working with
 * `agent_view IS NULL` and the MCP tools fall back to `body`. Mirrors the phase-31
 * `ensurePersonIdColumn` approach so the app server and the Settings seed path agree.
 */
export function ensureDualAudienceColumns(db: Database): void {
  const existing = new Set(
    (db.prepare(`PRAGMA table_info("kb_articles")`).all() as { name: string }[]).map(
      (row) => row.name,
    ),
  );
  const additions: Array<[string, string]> = [
    ['slug', 'TEXT'],
    ['agent_view', 'TEXT'],
    ['app_id', 'TEXT'],
    ['source_path', 'TEXT'],
  ];
  for (const [column, type] of additions) {
    if (!existing.has(column)) {
      db.exec(`ALTER TABLE "kb_articles" ADD COLUMN "${column}" ${type}`);
    }
  }
}

/** Parse the stored `agent_view` JSON, tolerating legacy garbage rather than throwing. */
function parseAgentView(raw: string | null | undefined): KbAgentView | null {
  if (!raw || !raw.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const view = parsed as Partial<KbAgentView>;
    return typeof view.summary === 'string' ? (view as KbAgentView) : null;
  } catch {
    return null;
  }
}

function serializeAgentView(view: KbAgentView | null | undefined): string | null {
  return view ? JSON.stringify(view) : null;
}

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug ?? null,
    title: row.title,
    category: row.category,
    tags: row.tags,
    body: row.body,
    agentView: parseAgentView(row.agent_view),
    appId: row.app_id ?? null,
    sourcePath: row.source_path ?? null,
    status: row.status as ArticleStatus,
    author: row.author,
    authorId: row.author_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ArticleRepository {
  constructor(private readonly db: Database) {}

  getById(id: number): Article | null {
    const row = this.db.prepare(`SELECT * FROM kb_articles WHERE id = ?`).get(id) as ArticleRow | undefined;
    return row ? mapArticle(row) : null;
  }

  /** Look up by stable slug — the address agents should cite. */
  getBySlug(slug: string): Article | null {
    const row = this.db
      .prepare(`SELECT * FROM kb_articles WHERE slug = ? LIMIT 1`)
      .get(slug) as ArticleRow | undefined;
    return row ? mapArticle(row) : null;
  }

  list(search?: string): Article[] {
    const term = (search ?? '').trim();
    if (term) {
      const like = `%${term}%`;
      return (
        this.db
          .prepare(
            `SELECT * FROM kb_articles
             WHERE title LIKE ? OR body LIKE ? OR tags LIKE ? OR category LIKE ?
             ORDER BY updated_at DESC, id DESC`,
          )
          .all(like, like, like, like) as ArticleRow[]
      ).map(mapArticle);
    }
    return (
      this.db.prepare(`SELECT * FROM kb_articles ORDER BY updated_at DESC, id DESC`).all() as ArticleRow[]
    ).map(mapArticle);
  }

  categories(): string[] {
    return (
      this.db
        .prepare(`SELECT DISTINCT category FROM kb_articles WHERE category != '' ORDER BY category ASC`)
        .all() as { category: string }[]
    ).map((r) => r.category);
  }

  create(input: UpsertArticleInput): Article {
    const info = this.db
      .prepare(
        `INSERT INTO kb_articles (title, category, tags, body, status, author, author_id,
           slug, agent_view, app_id, source_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title.trim(),
        input.category.trim(),
        input.tags.trim(),
        input.body,
        input.status,
        input.author.trim(),
        input.authorId ?? null,
        input.slug ?? null,
        serializeAgentView(input.agentView),
        input.appId ?? null,
        input.sourcePath ?? null,
      );
    return mapArticle(this.db.prepare(`SELECT * FROM kb_articles WHERE id = ?`).get(info.lastInsertRowid) as ArticleRow);
  }

  update(id: number, input: UpsertArticleInput): Article | null {
    if (!this.db.prepare(`SELECT id FROM kb_articles WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE kb_articles SET title = ?, category = ?, tags = ?, body = ?, status = ?,
           author = ?, author_id = ?, slug = ?, agent_view = ?, app_id = ?, source_path = ?,
           updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.category.trim(),
        input.tags.trim(),
        input.body,
        input.status,
        input.author.trim(),
        input.authorId ?? null,
        input.slug ?? null,
        serializeAgentView(input.agentView),
        input.appId ?? null,
        input.sourcePath ?? null,
        id,
      );
    return mapArticle(this.db.prepare(`SELECT * FROM kb_articles WHERE id = ?`).get(id) as ArticleRow);
  }

  delete(id: number): boolean {
    return this.db.prepare(`DELETE FROM kb_articles WHERE id = ?`).run(id).changes > 0;
  }
}
