import { describe, expect, test } from '@jest/globals';
import {
  buildIngestTextForKbArticle,
  composeKbArticleIngestText,
  computeKbArticleIngestContentHash,
  formatKbAgentViewForIngest,
  resolveKbArticleIngestSlug,
} from '@/shared/rag/kb-article-ingest-text';
import {
  KB_ARTICLE_CONTENT_UPDATED_EVENT_TYPE,
  KB_ARTICLE_INDEX_REMOVED_EVENT_TYPE,
  KB_ARTICLE_PUBLISHED_EVENT_TYPE,
  isKbRagDomainEventType,
  isKbRagIngestDomainEventType,
  isKbRagIndexRemoveDomainEventType,
  readKbArticleIdFromDomainEventPayload,
  readKbIngestSlugFromEventPayload,
} from '@/shared/rag/kb-rag-domain-events';

describe('kb-article-ingest-text', () => {
  test('resolveKbArticleIngestSlug prefers slug', () => {
    expect(resolveKbArticleIngestSlug('lab-stack', 12)).toBe('lab-stack');
    expect(resolveKbArticleIngestSlug(null, 12)).toBe('article-12');
  });

  test('formatKbAgentViewForIngest renders summary and facts', () => {
    const md = formatKbAgentViewForIngest({
      summary: 'How KB MCP works.',
      facts: [{ label: 'Port', value: '3016' }],
    });
    expect(md).toContain('## Agent summary');
    expect(md).toContain('## Facts');
    expect(md).toContain('3016');
  });

  test('composeKbArticleIngestText orders agent view before body', () => {
    const text = composeKbArticleIngestText({
      agentViewMarkdown: '## Agent summary\n\nHello agent.',
      body: '# Title\n\nHello human.',
    });
    expect(text.indexOf('Agent summary')).toBeLessThan(text.indexOf('Article body'));
    expect(text).toContain('Hello human.');
  });

  test('kb-rag domain event helpers', () => {
    expect(isKbRagIngestDomainEventType(KB_ARTICLE_PUBLISHED_EVENT_TYPE)).toBe(true);
    expect(isKbRagIngestDomainEventType(KB_ARTICLE_CONTENT_UPDATED_EVENT_TYPE)).toBe(true);
    expect(isKbRagIndexRemoveDomainEventType(KB_ARTICLE_INDEX_REMOVED_EVENT_TYPE)).toBe(true);
    expect(isKbRagDomainEventType(KB_ARTICLE_INDEX_REMOVED_EVENT_TYPE)).toBe(true);
    expect(isKbRagIngestDomainEventType('app-other.article.published')).toBe(false);
    expect(readKbArticleIdFromDomainEventPayload({ articleId: 42 })).toBe(42);
    expect(readKbArticleIdFromDomainEventPayload({ articleId: 'nope' })).toBeNull();
    expect(readKbIngestSlugFromEventPayload({ slug: 'lab-stack' }, 12)).toBe('lab-stack');
    expect(readKbIngestSlugFromEventPayload({ slug: null }, 12)).toBe('article-12');
  });

  test('buildIngestTextForKbArticle and hash are stable', () => {
    const article = {
      updatedAt: '2026-01-01T00:00:00.000Z',
      body: 'Body markdown.',
      agentView: { summary: 'Agent line.' },
    };
    const text = buildIngestTextForKbArticle(article);
    expect(text).toContain('Agent line.');
    expect(text).toContain('Body markdown.');
    const hashA = computeKbArticleIngestContentHash(article, text);
    const hashB = computeKbArticleIngestContentHash(article, text);
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });
});