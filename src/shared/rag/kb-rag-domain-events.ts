import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { resolveKbArticleIngestSlug } from '@/shared/rag/kb-article-ingest-text';

export const KB_RAG_SOURCE_APP_ID = 'app-knowledge-base';

export const KB_ARTICLE_PUBLISHED_EVENT_TYPE = buildLabEventType(
  KB_RAG_SOURCE_APP_ID,
  'article',
  'published',
);

export const KB_ARTICLE_CONTENT_UPDATED_EVENT_TYPE = buildLabEventType(
  KB_RAG_SOURCE_APP_ID,
  'article',
  'content_updated',
);

export const KB_ARTICLE_INDEX_REMOVED_EVENT_TYPE = buildLabEventType(
  KB_RAG_SOURCE_APP_ID,
  'article',
  'index_removed',
);

const KB_RAG_INGEST_DOMAIN_EVENT_TYPES: ReadonlySet<string> = new Set([
  KB_ARTICLE_PUBLISHED_EVENT_TYPE,
  KB_ARTICLE_CONTENT_UPDATED_EVENT_TYPE,
]);

const KB_RAG_INDEX_REMOVE_DOMAIN_EVENT_TYPES: ReadonlySet<string> = new Set([
  KB_ARTICLE_INDEX_REMOVED_EVENT_TYPE,
]);

export function isKbRagIngestDomainEventType(type: string): boolean {
  return KB_RAG_INGEST_DOMAIN_EVENT_TYPES.has(type);
}

export function isKbRagIndexRemoveDomainEventType(type: string): boolean {
  return KB_RAG_INDEX_REMOVE_DOMAIN_EVENT_TYPES.has(type);
}

export function isKbRagDomainEventType(type: string): boolean {
  return isKbRagIngestDomainEventType(type) || isKbRagIndexRemoveDomainEventType(type);
}

export function readKbArticleIdFromDomainEventPayload(
  payload: Record<string, unknown>,
): number | null {
  const raw = payload.articleId;
  const id = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(id) && id > 0 ? Math.floor(id) : null;
}

export function readKbIngestSlugFromEventPayload(
  payload: Record<string, unknown>,
  articleId: number,
): string {
  const raw = payload.slug;
  const slug = typeof raw === 'string' ? raw : raw === null ? null : undefined;
  return resolveKbArticleIngestSlug(slug ?? null, articleId);
}