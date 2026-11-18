import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  KB_DOC_ARTICLES,
  KB_DOCS_TAG_PREFIX,
  hasKnowledgeBaseDocs,
  kbDocsByCategory,
  kbDocsTagsFor,
  removeKnowledgeBaseDocs,
  seedKnowledgeBaseDocsIfMissing,
} from '@/apps/knowledge-base/back-end/db/seed-kb-docs';
import { CATALOG_DEMO_APP_IDS } from '@/shared/config/catalog-demo-seed-packs';
import {
  knowledgeBaseToolsManifest,
} from '@/backend/mcp/mcp-servers/knowledge-base/knowledge-base-mcp-server';
import { DEMO_ACCOUNTS } from '@/shared/config/demo-data-cast';

/**
 * rm-64 §30.8 / §30.8a — Knowledge Base as the documentation hub.
 *
 * The MCP reader talks to the app DB by path, so these tests cover the *seed* and the *tool
 * contract* rather than issuing live MCP calls (the reader resolves `process.cwd()`).
 */

function kbDb(): Database.Database {
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

describe('knowledge base documentation seed', () => {
  test('seeds every required category', () => {
    const db = kbDb();
    const { inserted } = seedKnowledgeBaseDocsIfMissing(db);
    expect(inserted).toBe(KB_DOC_ARTICLES.length);
    expect(hasKnowledgeBaseDocs(db)).toBe(true);

    const categories = new Set(KB_DOC_ARTICLES.map((article) => article.category));
    for (const required of [
      'Getting started',
      'Apps',
      'Integrations',
      'Platform',
      'Operations',
      'Agents',
      'Reference',
    ]) {
      expect({ required, ok: categories.has(required as never) }).toEqual({ required, ok: true });
    }
  });

  test('covers at least one article per launchable catalog app', () => {
    const slugs = new Set(KB_DOC_ARTICLES.map((article) => article.slug));
    // One `app-<name>` article per catalog app; the games share a single overview article.
    for (const appId of CATALOG_DEMO_APP_IDS) {
      const slug = `app-${appId.replace(/^app-/, '')}`;
      expect({ appId, covered: slugs.has(slug) }).toEqual({ appId, covered: true });
    }
  });

  test('is idempotent and every article is published', () => {
    const db = kbDb();
    seedKnowledgeBaseDocsIfMissing(db);
    expect(seedKnowledgeBaseDocsIfMissing(db).inserted).toBe(0);

    const rows = db.prepare('SELECT status FROM kb_articles').all() as { status: string }[];
    expect(rows.every((row) => row.status === 'published')).toBe(true);
  });

  test('every article carries a docs: source tag', () => {
    for (const article of KB_DOC_ARTICLES) {
      expect(kbDocsTagsFor(article)).toContain(`${KB_DOCS_TAG_PREFIX}${article.sourcePath}`);
      expect(article.sourcePath.startsWith('docs/') || article.sourcePath.endsWith('.md')).toBe(true);
    }
  });

  test('remove deletes only docs-tagged rows', () => {
    const db = kbDb();
    seedKnowledgeBaseDocsIfMissing(db);
    db.prepare(
      `INSERT INTO kb_articles (title, category, tags, body, status, author)
       VALUES ('Team note', 'Apps', 'team', 'body', 'published', 'Mia Chen')`,
    ).run();

    const removed = removeKnowledgeBaseDocs(db);
    expect(removed).toBe(KB_DOC_ARTICLES.length);
    expect(hasKnowledgeBaseDocs(db)).toBe(false);

    const remaining = db.prepare('SELECT title FROM kb_articles').all() as { title: string }[];
    expect(remaining).toEqual([{ title: 'Team note' }]);
  });

  test('category counts add up', () => {
    const counts = kbDocsByCategory();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(KB_DOC_ARTICLES.length);
  });

  test('no duplicate slugs or titles', () => {
    const slugs = KB_DOC_ARTICLES.map((article) => article.slug);
    const titles = KB_DOC_ARTICLES.map((article) => article.title);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test('articles reference canonical companies, never invented ones', () => {
    const bodyText = KB_DOC_ARTICLES.map((article) => article.body).join('\n');
    // The two hero accounts are named in the docs; no other invented company appears.
    expect(bodyText).toContain('Northwind Labs');
    expect(bodyText).toContain('Summit Health');
    expect(DEMO_ACCOUNTS).toContain('Northwind Labs');
  });
});

describe('knowledge base MCP tool contract', () => {
  test('exposes search, get and app context', () => {
    expect(knowledgeBaseToolsManifest.map((tool) => tool.id).sort()).toEqual([
      'lab_kb_app_context',
      'lab_kb_get',
      'lab_kb_search',
    ]);
  });

  test('search params cover query, category, tags, appId and limit', () => {
    const search = knowledgeBaseToolsManifest.find((tool) => tool.id === 'lab_kb_search');
    const shape = search?.params.shape ?? {};
    expect(Object.keys(shape).sort()).toEqual([
      'appId',
      'category',
      'includeUnpublished',
      'limit',
      'query',
      'tags',
    ]);
  });

  test('get accepts a stable slug as well as an articleId', () => {
    const get = knowledgeBaseToolsManifest.find((tool) => tool.id === 'lab_kb_get');
    expect(Object.keys(get?.params.shape ?? {}).sort()).toEqual(['articleId', 'slug']);
  });

  test('app context takes an appId and resolves live system instructions', () => {
    const appContext = knowledgeBaseToolsManifest.find((tool) => tool.id === 'lab_kb_app_context');
    expect(Object.keys(appContext?.params.shape ?? {})).toEqual(['appId']);
    expect(appContext?.description).toMatch(/app_system_instructions|system instructions/i);
  });

  test('descriptions state when to use the tool, not just what it does', () => {
    for (const tool of knowledgeBaseToolsManifest) {
      expect(tool.description.length).toBeGreaterThan(80);
      expect(tool.description).toMatch(/use (this|when)/i);
    }
  });

  test('search description mentions published-only default', () => {
    const search = knowledgeBaseToolsManifest.find((tool) => tool.id === 'lab_kb_search');
    expect(search?.description).toMatch(/published/i);
  });
});
