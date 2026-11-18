import { createHash } from 'node:crypto';

import { stripKbSectionIconSnippetsFromMarkdown } from '@/shared/utils/kb-article-markdown';

/** Structured `agent_view` shape stored on `kb_articles` (subset used for RAG ingest). */
export type KbAgentViewIngest = {
  summary: string;
  facts?: Array<{ label: string; value: string }>;
  contracts?: string[];
  patterns?: string[];
  gotchas?: string[];
  liveSources?: string[];
  relatedSlugs?: string[];
};

export function resolveKbArticleIngestSlug(
  slug: string | null | undefined,
  articleId: number,
): string {
  const trimmed = slug?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `article-${articleId}`;
}

export function formatKbAgentViewForIngest(view: KbAgentViewIngest | null | undefined): string {
  if (!view?.summary?.trim()) {
    return '';
  }

  const sections: string[] = [`## Agent summary\n\n${view.summary.trim()}`];

  if (view.facts?.length) {
    sections.push(
      `## Facts\n\n${view.facts.map((f) => `- **${f.label}:** ${f.value}`).join('\n')}`,
    );
  }
  if (view.contracts?.length) {
    sections.push(`## Contracts\n\n${view.contracts.map((c) => `- ${c}`).join('\n')}`);
  }
  if (view.patterns?.length) {
    sections.push(`## Patterns\n\n${view.patterns.map((p) => `- ${p}`).join('\n')}`);
  }
  if (view.gotchas?.length) {
    sections.push(`## Gotchas\n\n${view.gotchas.map((g) => `- ${g}`).join('\n')}`);
  }
  if (view.liveSources?.length) {
    sections.push(`## Live sources\n\n${view.liveSources.map((s) => `- ${s}`).join('\n')}`);
  }
  if (view.relatedSlugs?.length) {
    sections.push(`## Related slugs\n\n${view.relatedSlugs.map((s) => `- ${s}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Text blob to chunk + embed per published article (agent_view first, then body).
 * @see phase-2-prep — prefer agent_view + key body sections.
 */
export function composeKbArticleIngestText(params: {
  agentViewMarkdown: string;
  body: string;
}): string {
  const agent = params.agentViewMarkdown.trim();
  const human = stripKbSectionIconSnippetsFromMarkdown(params.body).trim();

  if (agent && human) {
    return `${agent}\n\n## Article body\n\n${human}`;
  }
  if (agent) {
    return agent;
  }
  return human;
}

export type KbArticleIngestFields = {
  updatedAt: string;
  body: string;
  agentView: KbAgentViewIngest | null;
};

export function buildIngestTextForKbArticle(article: KbArticleIngestFields): string {
  return composeKbArticleIngestText({
    agentViewMarkdown: formatKbAgentViewForIngest(article.agentView),
    body: article.body,
  });
}

/** Stable hash for reconcile ledger (ingest text + `updated_at`). */
export function computeKbArticleIngestContentHash(
  article: Pick<KbArticleIngestFields, 'updatedAt'>,
  ingestText: string,
): string {
  return createHash('sha256').update(ingestText).update('\0').update(article.updatedAt).digest('hex');
}