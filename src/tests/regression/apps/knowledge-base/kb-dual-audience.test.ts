import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  ArticleRepository,
  bootstrapArticleTables,
  ensureDualAudienceColumns,
} from '@/apps/knowledge-base/back-end/article-repository';
import {
  KB_DOC_APP_IDS,
  KB_DOC_ARTICLES,
  seedKnowledgeBaseDocsIfMissing,
} from '@/apps/knowledge-base/back-end/db/seed-kb-docs';

/**
 * The Knowledge Base serves two audiences from one row: `body` for humans, `agent_view` for
 * agents, linked to a registry app by `app_id`. These tests cover the storage half — the MCP
 * tools in `kb-reader.ts` are exercised separately.
 */

function memoryDb(): Database.Database {
  const db = new Database(':memory:');
  bootstrapArticleTables(db);
  return db;
}

/** A pre-dual-audience database: the original phase-31 shape, no slug/agent_view/app_id. */
function legacyDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE kb_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      author TEXT NOT NULL DEFAULT '',
      author_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.prepare(
    `INSERT INTO kb_articles (title, category, tags, body, status, author)
     VALUES ('Forms Builder', 'Apps', 'docs:docs/x.md,forms', 'old body', 'published', 'Admin')`,
  ).run();
  return db;
}

describe('ensureDualAudienceColumns', () => {
  test('adds all four columns to a legacy table', () => {
    const db = legacyDb();
    ensureDualAudienceColumns(db);
    const columns = (db.prepare(`PRAGMA table_info("kb_articles")`).all() as { name: string }[]).map(
      (row) => row.name,
    );
    expect(columns).toEqual(
      expect.arrayContaining(['slug', 'agent_view', 'app_id', 'source_path']),
    );
  });

  test('is idempotent — running twice does not throw', () => {
    const db = legacyDb();
    ensureDualAudienceColumns(db);
    expect(() => ensureDualAudienceColumns(db)).not.toThrow();
  });

  test('bootstrapArticleTables already includes the columns', () => {
    const db = memoryDb();
    const columns = (db.prepare(`PRAGMA table_info("kb_articles")`).all() as { name: string }[]).map(
      (row) => row.name,
    );
    expect(columns).toEqual(expect.arrayContaining(['slug', 'agent_view', 'app_id', 'source_path']));
  });
});

describe('ArticleRepository dual-audience round-trip', () => {
  const base = {
    title: 'Forms Builder',
    category: 'Apps',
    tags: 'forms',
    body: '# Forms Builder\n\nHuman prose.',
    status: 'published' as const,
    author: 'Admin',
  };

  test('stores and returns the agent view, slug, app id and source path', () => {
    const repo = new ArticleRepository(memoryDb());
    const created = repo.create({
      ...base,
      slug: 'app-forms-builder',
      appId: 'app-forms-builder',
      sourcePath: 'docs/platform/lab-integration-host-authoring.md',
      agentView: {
        summary: 'Provider for form.surface bindings.',
        facts: [{ label: 'Registry id', value: 'app-forms-builder' }],
        gotchas: ['viewer cannot launch apps'],
      },
    });

    expect(created.slug).toBe('app-forms-builder');
    expect(created.appId).toBe('app-forms-builder');
    expect(created.sourcePath).toBe('docs/platform/lab-integration-host-authoring.md');
    expect(created.agentView?.summary).toBe('Provider for form.surface bindings.');
    expect(created.agentView?.gotchas).toEqual(['viewer cannot launch apps']);
  });

  test('an article with no agent view is still valid — tools fall back to body', () => {
    const repo = new ArticleRepository(memoryDb());
    const created = repo.create(base);
    expect(created.agentView).toBeNull();
    expect(created.slug).toBeNull();
    expect(created.body).toContain('Human prose');
  });

  test('getBySlug finds the article; unknown slug returns null', () => {
    const repo = new ArticleRepository(memoryDb());
    repo.create({ ...base, slug: 'app-crm' });
    expect(repo.getBySlug('app-crm')?.title).toBe('Forms Builder');
    expect(repo.getBySlug('nope')).toBeNull();
  });

  test('malformed agent_view JSON degrades to null instead of throwing', () => {
    const db = memoryDb();
    const repo = new ArticleRepository(db);
    const created = repo.create({ ...base, slug: 'broken' });
    db.prepare(`UPDATE kb_articles SET agent_view = ? WHERE id = ?`).run('{not json', created.id);

    expect(() => repo.getById(created.id)).not.toThrow();
    expect(repo.getById(created.id)?.agentView).toBeNull();
  });

  test('an agent_view without a summary is rejected as malformed', () => {
    const db = memoryDb();
    const repo = new ArticleRepository(db);
    const created = repo.create({ ...base, slug: 'no-summary' });
    db.prepare(`UPDATE kb_articles SET agent_view = ? WHERE id = ?`).run(
      JSON.stringify({ facts: [] }),
      created.id,
    );
    expect(repo.getById(created.id)?.agentView).toBeNull();
  });
});

describe('seed re-seed reconciliation', () => {
  test('upgrades a legacy row and fills the new columns', () => {
    const db = legacyDb();
    seedKnowledgeBaseDocsIfMissing(db, { adminApply: true });

    const row = db
      .prepare(`SELECT slug, app_id, source_path, agent_view, body FROM kb_articles WHERE title = ?`)
      .get('Forms Builder') as
      | { slug: string; app_id: string; source_path: string; agent_view: string; body: string }
      | undefined;

    expect(row).toBeDefined();
    // Slug is the KB address; app_id is the *registry* id, which carries the app-lab- prefix.
    expect(row?.slug).toBe('app-forms-builder');
    expect(row?.app_id).toBe('app-lab-formsbuilder');
    expect(row?.source_path).toBe('docs/platform/lab-integration-host-authoring.md');
    // The reconcile pass replaces the stale body rather than leaving it.
    expect(row?.body).not.toBe('old body');
    expect(row?.agent_view).toContain('form.surface');
  });

  test('reconciliation runs even without adminApply, so content edits land', () => {
    const db = legacyDb();
    seedKnowledgeBaseDocsIfMissing(db);
    const body = (
      db.prepare(`SELECT body FROM kb_articles WHERE title = ?`).get('Forms Builder') as {
        body: string;
      }
    ).body;
    expect(body).not.toBe('old body');
  });

  test('does not duplicate rows on a second run', () => {
    const db = legacyDb();
    seedKnowledgeBaseDocsIfMissing(db, { adminApply: true });
    const first = (
      db.prepare(`SELECT COUNT(*) AS n FROM kb_articles`).get() as { n: number }
    ).n;
    seedKnowledgeBaseDocsIfMissing(db, { adminApply: true });
    const second = (
      db.prepare(`SELECT COUNT(*) AS n FROM kb_articles`).get() as { n: number }
    ).n;
    expect(second).toBe(first);
  });

  test('leaves user-authored articles untouched', () => {
    const db = legacyDb();
    db.prepare(
      `INSERT INTO kb_articles (title, category, tags, body, status, author)
       VALUES ('My own note', 'Platform', 'mine', 'do not touch', 'draft', 'Mia')`,
    ).run();
    seedKnowledgeBaseDocsIfMissing(db, { adminApply: true });

    const row = db.prepare(`SELECT body FROM kb_articles WHERE title = ?`).get('My own note') as {
      body: string;
    };
    expect(row.body).toBe('do not touch');
  });
});

describe('seed content contract', () => {
  test('every app article maps to a registry app id, and the games article deliberately does not', () => {
    const appArticles = KB_DOC_ARTICLES.filter((article) => article.category === 'Apps');
    expect(appArticles.length).toBeGreaterThan(0);

    for (const article of appArticles) {
      const resolved = article.appId ?? KB_DOC_APP_IDS[article.slug];
      if (article.slug === 'app-games') {
        expect(resolved).toBeUndefined();
        continue;
      }
      expect(resolved).toBeTruthy();
      expect(resolved?.startsWith('app-')).toBe(true);
    }
  });

  test('no article puts an agent-only instruction block in the human body', () => {
    // `### Agents — use lab_kb_search…` was prose aimed at tools, not people.
    for (const article of KB_DOC_ARTICLES) {
      expect(article.body).not.toContain('lab_kb_search` to find articles');
    }
  });

  test('app articles use real headings, not bold labels', () => {
    const forms = KB_DOC_ARTICLES.find((article) => article.slug === 'app-forms-builder');
    expect(forms).toBeDefined();
    expect(forms?.body).toContain('## Purpose');
    expect(forms?.body).not.toContain('**Purpose**');
  });

  test('annotated articles carry a summary and at least one gotcha or pattern', () => {
    const annotated = KB_DOC_ARTICLES.filter((article) => article.agentView);
    expect(annotated.length).toBeGreaterThanOrEqual(2);
    for (const article of annotated) {
      expect(article.agentView?.summary.length).toBeGreaterThan(20);
      const depth =
        (article.agentView?.gotchas?.length ?? 0) + (article.agentView?.patterns?.length ?? 0);
      expect(depth).toBeGreaterThan(0);
    }
  });
});
