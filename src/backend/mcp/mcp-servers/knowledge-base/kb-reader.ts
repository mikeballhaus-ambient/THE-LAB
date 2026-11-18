import type { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { AppDatabaseManager } from '@/backend/AppDatabaseManager';
import { resolveAppDatabaseFolderId } from '@/backend/platform/app-seed-data-db-id';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { stripKbSectionIconSnippetsFromMarkdown } from '@/shared/utils/kb-article-markdown';
import type { KbAgentViewIngest } from '@/shared/rag/kb-article-ingest-text';
import { resolveKbArticleIngestSlug } from '@/shared/rag/kb-article-ingest-text';
import { resolveUserEmbedProviderAdapter } from '@/backend/chroma/kb-rag-embed-provider';
import { KbChunksIndex } from '@/backend/chroma/kb-chunks-index';
import {
  isKbRagHybridSearchEnabled,
  resolveKbRagEmbedUserId,
  resolveKbRagMinScore,
} from '@/shared/config/kb-rag-config';
import {
  boostKbSearchScoresWithVectorSlugs,
  mergeKbSearchScoresWithVectorOnlyRows,
  sortKbSearchScoredRows,
  type KbSearchScoredRow,
} from '@/shared/rag/kb-search-hybrid';

/**
 * Read-only access to the Knowledge Base app SQLite file, plus live resolution of the
 * platform `apps` registry for app-scoped articles.
 *
 * **Decoupling (AGENTS.md #10):** core must not import `src/apps/knowledge-base/**`. This
 * module therefore speaks to the app's *database* by registry id + table shape only — the
 * same approach `app-seed-data-direct.ts` uses. If the KB schema changes, only the SQL here
 * and the MCP tool contract need to move.
 *
 * Read-only: the MCP tools must never mutate KB content. Authors change articles in the app.
 *
 * **Two audiences.** `body` is human markdown. `agent_view` is the structured projection an
 * agent reads. When `agent_view` is absent the tools fall back to `body` so no article is
 * unusable, but the structured form is what makes tool selection and citation reliable.
 *
 * **Live data is never copied.** An article with `app_id` names the app; the current
 * `app_system_instructions` is read from `appsRepository` at call time
 * ({@link getAppContext}), which is an in-process read of the platform registry — no MCP
 * permission grant involved. That is why a persona can resolve app guidance through the KB
 * even without `app_management_*` access.
 */

export const KB_REGISTRY_APP_ID = 'app-knowledge-base';

export interface KbAgentView {
  summary: string;
  facts?: Array<{ label: string; value: string }>;
  contracts?: string[];
  patterns?: string[];
  gotchas?: string[];
  liveSources?: string[];
  relatedSlugs?: string[];
}

export interface KbArticleSummary {
  id: number;
  slug: string | null;
  title: string;
  category: string;
  tags: string;
  status: string;
  appId: string | null;
  updatedAt: string;
  snippet: string;
  /** Machine-oriented one-liner; `null` when the article has not been agent-annotated. */
  agentSummary: string | null;
}

export interface KbArticleDetail extends KbArticleSummary {
  body: string;
  agentView: KbAgentView | null;
  sourcePath: string | null;
  author: string;
  authorId: number | null;
  createdAt: string;
}

interface KbRow {
  id: number;
  title: string;
  category: string;
  tags: string;
  body: string;
  status: string;
  author: string;
  author_id: number | null;
  created_at: string;
  updated_at: string;
  slug?: string | null;
  agent_view?: string | null;
  app_id?: string | null;
  source_path?: string | null;
}

/** Absolute path of the KB app DB (`src/apps/knowledge-base/db/the_lab.db`). */
export function knowledgeBaseDbPath(): string {
  const folder = resolveAppDatabaseFolderId(KB_REGISTRY_APP_ID);
  return path.join(process.cwd(), 'src', 'apps', folder, 'db', 'the_lab.db');
}

/**
 * Open the KB database read-only.
 *
 * Returns `null` when the file or the `kb_articles` table does not exist yet (fresh clone
 * before the KB app has ever started), so the tools can report a clear message instead of
 * throwing.
 */
async function openReadOnly(): Promise<Database | null> {
  const file = knowledgeBaseDbPath();
  if (!fs.existsSync(file)) {
    return null;
  }
  // Reuse the shared connection manager so we do not hold a second writable handle.
  const db = await AppDatabaseManager.getInstance().getConnection(
    resolveAppDatabaseFolderId(KB_REGISTRY_APP_ID),
  );
  const hasTable = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'kb_articles' LIMIT 1`)
    .get();
  return hasTable ? db : null;
}

/** Parse the stored `agent_view` JSON; legacy or malformed rows degrade to `null`. */
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

function snippet(body: string, query: string, fallbackLength = 200): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (!text) {
    return '';
  }
  const needle = query.trim().toLowerCase();
  if (needle) {
    const index = text.toLowerCase().indexOf(needle);
    if (index >= 0) {
      const start = Math.max(0, index - 60);
      const end = Math.min(text.length, index + needle.length + fallbackLength);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < text.length ? '…' : '';
      return `${prefix}${text.slice(start, end)}${suffix}`;
    }
  }
  return text.length <= fallbackLength ? text : `${text.slice(0, fallbackLength)}…`;
}

function mapSummary(row: KbRow, query: string): KbArticleSummary {
  const agentView = parseAgentView(row.agent_view);
  return {
    id: row.id,
    slug: row.slug ?? null,
    title: row.title,
    category: row.category,
    tags: row.tags,
    status: row.status,
    appId: row.app_id ?? null,
    updatedAt: row.updated_at,
    snippet: snippet(row.body, query),
    agentSummary: agentView?.summary ?? null,
  };
}

export interface KbSearchParams {
  query?: string;
  category?: string;
  tags?: string[];
  /** Filter to articles documenting a specific registry app. */
  appId?: string;
  limit?: number;
  /** Include non-published articles. Off by default — agents should see published docs. */
  includeUnpublished?: boolean;
  /** Embed-capable user for vector leg of hybrid search (`LAB_KB_RAG_HYBRID_SEARCH=1`). */
  embedUserId?: number;
}

export interface KbSearchResult {
  success: boolean;
  content: string;
  articles: KbArticleSummary[];
}

/**
 * Ranked search over published articles.
 *
 * Ranking: title match (3) > tag match (2) > category match (1) > body match (1), then most
 * recently updated. Deliberately simple and deterministic — no FTS table to keep in sync.
 */
export async function searchKnowledgeBase(params: KbSearchParams): Promise<KbSearchResult> {
  const db = await openReadOnly();
  if (!db) {
    return {
      success: false,
      content:
        'Knowledge Base database is not available yet. Launch the Knowledge Base app once so its ' +
        'schema is created, then retry.',
      articles: [],
    };
  }

  const query = (params.query ?? '').trim();
  const category = (params.category ?? '').trim();
  const appId = (params.appId ?? '').trim();
  const tags = (params.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  const where: string[] = [];
  const args: Array<string | number> = [];

  if (!params.includeUnpublished) {
    where.push(`status = 'published'`);
  }
  if (category) {
    where.push(`category = ? COLLATE NOCASE`);
    args.push(category);
  }
  if (appId) {
    where.push(`app_id = ? COLLATE NOCASE`);
    args.push(appId);
  }
  if (query) {
    where.push(
      `(title LIKE ? COLLATE NOCASE OR body LIKE ? COLLATE NOCASE OR tags LIKE ? COLLATE NOCASE OR category LIKE ? COLLATE NOCASE)`,
    );
    const like = `%${query}%`;
    args.push(like, like, like, like);
  }

  const sql = `SELECT * FROM kb_articles${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
  const rows = db.prepare(sql).all(...args) as KbRow[];

  const needle = query.toLowerCase();
  let scored: KbSearchScoredRow<KbRow>[] = rows
    .filter((row) => {
      if (tags.length === 0) {
        return true;
      }
      const rowTags = row.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      return tags.every((tag) => rowTags.includes(tag));
    })
    .map((row) => {
      let score = 0;
      if (needle) {
        if (row.title.toLowerCase().includes(needle)) score += 3;
        if (row.tags.toLowerCase().includes(needle)) score += 2;
        if (row.category.toLowerCase().includes(needle)) score += 1;
        if (row.body.toLowerCase().includes(needle)) score += 1;
        // An agent-annotated match is a stronger signal than a prose mention.
        if ((row.agent_view ?? '').toLowerCase().includes(needle)) score += 2;
      }
      return { row, score };
    });

  scored = await applyKbHybridVectorSearch({
    db,
    query,
    limit,
    scored,
    embedUserId: params.embedUserId,
  });

  scored = sortKbSearchScoredRows(scored, (a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);

  const summaries = scored.map(({ row }) => mapSummary(row, query));

  if (summaries.length === 0) {
    return {
      success: true,
      content: `No published articles matched${query ? ` "${query}"` : ''}. Try a broader query, or drop the category/tag filters.`,
      articles: [],
    };
  }

  const lines = summaries.map((article) => {
    const address = article.slug ? `slug=${article.slug}` : `id=${article.id}`;
    const app = article.appId ? ` · app=${article.appId}` : '';
    const summary = article.agentSummary ? `\n  ${article.agentSummary}` : `\n  ${article.snippet}`;
    return `- [${address}] ${article.title} — ${article.category}${app}${summary}`;
  });
  return {
    success: true,
    content: `Found ${summaries.length} article(s)${query ? ` for "${query}"` : ''}:\n\n${lines.join('\n')}`,
    articles: summaries,
  };
}

async function applyKbHybridVectorSearch(params: {
  db: Database;
  query: string;
  limit: number;
  scored: KbSearchScoredRow<KbRow>[];
  embedUserId?: number;
}): Promise<KbSearchScoredRow<KbRow>[]> {
  if (!isKbRagHybridSearchEnabled() || !params.query.trim()) {
    return params.scored;
  }

  const userId = params.embedUserId ?? resolveKbRagEmbedUserId();
  const embedProvider = resolveUserEmbedProviderAdapter(userId);
  if (!embedProvider?.embed) {
    return params.scored;
  }

  let vectorHits;
  try {
    vectorHits = await KbChunksIndex.getInstance().queryTopK({
      query: params.query,
      k: params.limit,
      embedProvider,
      minScore: resolveKbRagMinScore(),
    });
  } catch {
    return params.scored;
  }

  const vectorSlugs = [...new Set(vectorHits.map((hit) => hit.slug))];
  if (vectorSlugs.length === 0) {
    return params.scored;
  }

  let merged = boostKbSearchScoresWithVectorSlugs(params.scored, vectorSlugs);

  const presentSlugs = new Set(
    merged.map((entry) => entry.row.slug).filter((slug): slug is string => Boolean(slug)),
  );
  const missingSlugs = vectorSlugs.filter((slug) => !presentSlugs.has(slug));
  if (missingSlugs.length > 0) {
    const placeholders = missingSlugs.map(() => '?').join(', ');
    const extraRows = params.db
      .prepare(
        `SELECT * FROM kb_articles WHERE slug IN (${placeholders}) AND status = 'published'`,
      )
      .all(...missingSlugs) as KbRow[];
    merged = mergeKbSearchScoresWithVectorOnlyRows(merged, extraRows);
  }

  return merged;
}

export interface KbGetParams {
  /** Article id or slug. Slugs are preferred because they survive a re-seed. */
  articleId?: number;
  slug?: string;
}

export interface KbGetResult {
  success: boolean;
  content: string;
  article: KbArticleDetail | null;
}

function toDetail(row: KbRow): KbArticleDetail {
  return {
    ...mapSummary(row, ''),
    snippet: '',
    body: row.body,
    agentView: parseAgentView(row.agent_view),
    sourcePath: row.source_path ?? null,
    author: row.author,
    authorId: row.author_id ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Render the agent-facing document: the structured projection first (that is what the caller
 * asked for), with the human body appended as supporting context.
 */
function formatArticleForAgent(row: KbRow, view: KbAgentView | null): string {
  const header = [
    `# ${row.title}`,
    '',
    `Category: ${row.category}`,
    row.slug ? `Slug: ${row.slug}` : '',
    row.app_id ? `App: ${row.app_id}` : '',
    row.tags ? `Tags: ${row.tags}` : '',
    `Status: ${row.status}`,
    row.author ? `Author: ${row.author}` : '',
    `Updated: ${row.updated_at}`,
    row.source_path ? `Source: ${row.source_path}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (!view) {
    return `${header}\n\n${row.body}`;
  }

  const sections: string[] = [header, '', '## Summary', view.summary];

  if (view.facts?.length) {
    sections.push('', '## Facts', '| Fact | Value |', '|---|---|');
    for (const fact of view.facts) {
      sections.push(`| ${fact.label} | ${fact.value} |`);
    }
  }
  if (view.contracts?.length) {
    sections.push('', '## Contracts', ...view.contracts.map((item) => `- ${item}`));
  }
  if (view.patterns?.length) {
    sections.push('', '## Patterns', ...view.patterns.map((item) => `- ${item}`));
  }
  if (view.gotchas?.length) {
    sections.push('', '## Gotchas', ...view.gotchas.map((item) => `- ${item}`));
  }
  if (view.liveSources?.length) {
    sections.push(
      '',
      '## Live sources',
      'Resolve these at call time; do not trust a cached copy.',
      ...view.liveSources.map((item) => `- ${item}`),
    );
  }
  if (row.app_id) {
    sections.push(
      '',
      '## App context',
      `Call \`lab_kb_app_context\` with appId="${row.app_id}" for this app's current ` +
        'system instructions, port and dependencies.',
    );
  }
  if (view.relatedSlugs?.length) {
    sections.push('', '## Related', ...view.relatedSlugs.map((item) => `- ${item}`));
  }

  sections.push(
    '',
    '## Full article (human view)',
    stripKbSectionIconSnippetsFromMarkdown(row.body),
  );
  return sections.join('\n');
}

/** Full article by id or slug. */
export async function getKnowledgeBaseArticle(params: KbGetParams): Promise<KbGetResult> {
  const db = await openReadOnly();
  if (!db) {
    return {
      success: false,
      content:
        'Knowledge Base database is not available yet. Launch the Knowledge Base app once so its ' +
        'schema is created, then retry.',
      article: null,
    };
  }

  const slug = (params.slug ?? '').trim();
  const row = slug
    ? (db.prepare(`SELECT * FROM kb_articles WHERE slug = ? COLLATE NOCASE LIMIT 1`).get(slug) as
        | KbRow
        | undefined)
    : (db.prepare(`SELECT * FROM kb_articles WHERE id = ? LIMIT 1`).get(params.articleId) as
        | KbRow
        | undefined);

  if (!row) {
    const what = slug ? `slug "${slug}"` : `id ${params.articleId}`;
    return {
      success: false,
      content: `No Knowledge Base article with ${what}. Use lab_kb_search to find one.`,
      article: null,
    };
  }

  const article = toDetail(row);
  return {
    success: true,
    content: formatArticleForAgent(row, article.agentView),
    article,
  };
}

export interface KbAppContextResult {
  success: boolean;
  content: string;
  app: {
    id: string;
    name: string;
    description: string;
    type: string;
    requiresPort: number | null;
    dependencies: string[];
    optionalDependencies: string[];
    version: string;
    isEnabled: boolean;
    isSystem: boolean;
    appSystemInstructions: string;
  } | null;
}

/**
 * Resolve live app context for an app-scoped article.
 *
 * Reads `appsRepository` **in process** — the KB MCP server runs in the same Fastify backend
 * as the registry, so this is a plain function call rather than an MCP hop. Deliberately not
 * gated on `app_management_*` tool permissions: `app_system_instructions` is written to be
 * agent-facing guidance, and `the-lab-db` already gives every user `read_query` against the
 * same table.
 *
 * The point is *interpretation*, not access — the response pairs the raw instructions with
 * what an agent should actually do with them.
 */
export async function getAppContext(appId: string): Promise<KbAppContextResult> {
  const id = appId.trim();
  if (!id) {
    return { success: false, content: 'appId is required.', app: null };
  }

  const app = appsRepository.getAppsById(id);
  if (!app) {
    return {
      success: false,
      content:
        `No app registered with id "${id}". Use the app management tool's get_apps operation ` +
        'to list valid ids.',
      app: null,
    };
  }

  const instructions = (app.appSystemInstructions ?? '').trim();
  const header = [
    `# ${app.name} (${app.id})`,
    '',
    `Type: ${app.type}`,
    `Enabled: ${app.isEnabled ? 'yes' : 'no'}`,
    app.requiresPort ? `Port: ${app.requiresPort}` : '',
    `Version: ${app.version}`,
    app.dependencies.length ? `Dependencies: ${app.dependencies.join(', ')}` : '',
    app.optionalDependencies.length
      ? `Optional dependencies: ${app.optionalDependencies.join(', ')}`
      : '',
    `System app: ${app.isSystem ? 'yes' : 'no'}`,
    '',
    app.description || '(no description)',
  ]
    .filter(Boolean)
    .join('\n');

  const body = instructions
    ? `\n\n## System instructions (live)\n\n${instructions}`
    : '\n\n_This app has no `app_system_instructions` recorded._';

  const guidance = [
    '',
    '',
    '## How to act on this',
    '- The instructions above are the authority for driving this app through UI Automation.',
    '- To change this app\'s UI or record shape, switch to the Code persona and follow the ' +
      'integration playbooks — do not hand-edit the app database.',
    '- To inspect the app\'s own data, it has a separate SQLite file; use the app management ' +
      'tool rather than `the-lab-db`.',
    '- `lab_kb_search` with `appId` returns the documentation articles for this app.',
  ].join('\n');

  return {
    success: true,
    content: `${header}${body}${guidance}`,
    app: {
      id: app.id,
      name: app.name,
      description: app.description,
      type: app.type,
      requiresPort: app.requiresPort ?? null,
      dependencies: app.dependencies ?? [],
      optionalDependencies: app.optionalDependencies ?? [],
      version: app.version,
      isEnabled: Boolean(app.isEnabled),
      isSystem: Boolean(app.isSystem),
      appSystemInstructions: instructions,
    },
  };
}

/** One published row for KB → Chroma RAG ingest (read-only; no app code imports). */
export interface KbArticleIngestSource {
  id: number;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  body: string;
  agentView: KbAgentViewIngest | null;
}

/**
 * All `published` articles for vector ingest / startup reconcile.
 * Returns `null` when the KB DB is not available yet (fresh clone).
 */
function mapRowToIngestSource(row: KbRow): KbArticleIngestSource {
  return {
    id: row.id,
    slug: resolveKbArticleIngestSlug(row.slug, row.id),
    title: row.title,
    status: row.status,
    updatedAt: row.updated_at,
    body: row.body,
    agentView: parseAgentView(row.agent_view) as KbAgentViewIngest | null,
  };
}

/** Published article by id for RAG incremental ingest. */
export async function getKbArticleIngestSourceById(
  articleId: number,
): Promise<KbArticleIngestSource | null> {
  const db = await openReadOnly();
  if (!db) {
    return null;
  }

  const row = db
    .prepare(`SELECT * FROM kb_articles WHERE id = ? LIMIT 1`)
    .get(articleId) as KbRow | undefined;

  if (!row || row.status !== 'published') {
    return null;
  }

  return mapRowToIngestSource(row);
}

export async function listPublishedKbArticlesForIngest(): Promise<KbArticleIngestSource[] | null> {
  const db = await openReadOnly();
  if (!db) {
    return null;
  }

  const rows = db
    .prepare(
      `SELECT id, slug, title, status, updated_at, body, agent_view
       FROM kb_articles
       WHERE status = 'published'
       ORDER BY updated_at DESC`,
    )
    .all() as KbRow[];

  return rows.map((row) => mapRowToIngestSource(row));
}
