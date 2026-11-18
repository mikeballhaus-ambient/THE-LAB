export type ArticleStatus = 'draft' | 'published' | 'archived';

/**
 * The machine-oriented projection of an article.
 *
 * Two audiences read the Knowledge Base: people and agents. `Article.body` is authored
 * markdown for people. This is the same knowledge expressed as structured fields for agents,
 * who need facts, contracts and gotchas rather than prose.
 *
 * **Do not copy live platform state in here.** A port number or an instructions blob stored
 * in `facts` goes stale the moment the registry changes. Name the source in
 * {@link KbAgentView.liveSources} and let `lab_kb_app_context` resolve it at call time.
 */
export interface KbAgentView {
  /** One line: what this is, phrased for a machine reader rather than a person. */
  summary: string;
  /** Stable identifiers, ports, table and column names, manifest names. */
  facts?: Array<{ label: string; value: string }>;
  /** Surface ids, tool ids, connector slots this thing participates in. */
  contracts?: string[];
  /** How to do it correctly — the pattern to follow. */
  patterns?: string[];
  /** Limits and non-obvious traps. Prefer these over burying a warning in prose. */
  gotchas?: string[];
  /** Where the live truth lives (e.g. `apps.app_system_instructions`, `lab_kb_search`). */
  liveSources?: string[];
  /** Slugs of related articles. */
  relatedSlugs?: string[];
}

export interface Article {
  id: number;
  /** Stable, human-readable address used by the MCP tools and citations. */
  slug?: string | null;
  title: string;
  category: string;
  tags: string;
  /** Human markdown. Rendered with `renderLabMarkdown(body, { breaks: false })`. */
  body: string;
  /** Structured agent projection. `null` until authored — tools fall back to `body`. */
  agentView?: KbAgentView | null;
  /**
   * Registry app id (`app-forms-builder`) when the article documents one app.
   * `null` for cross-cutting docs. Drives live `app_system_instructions` resolution.
   */
  appId?: string | null;
  /** Path under `docs/` this article was authored from, for reconciliation. */
  sourcePath?: string | null;
  status: ArticleStatus;
  author: string;
  /** Platform user id when the author was picked from the lookup (phase 31). */
  authorId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertArticleInput {
  title: string;
  category: string;
  tags: string;
  body: string;
  status: ArticleStatus;
  author: string;
  authorId?: number | null;
  slug?: string | null;
  agentView?: KbAgentView | null;
  appId?: string | null;
  sourcePath?: string | null;
}
