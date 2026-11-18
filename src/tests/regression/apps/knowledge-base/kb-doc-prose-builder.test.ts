import { describe, expect, test } from '@jest/globals';
import {
  KB_HUMAN_BODY_MIN_CHARS,
  enrichKbHumanBody,
} from '@/apps/knowledge-base/back-end/db/kb-doc-prose-builder';
import { KB_DOC_ARTICLES } from '@/apps/knowledge-base/back-end/db/seed-kb-docs';

describe('kb-doc-prose-builder', () => {
  test('every seeded doc article meets minimum human body length', () => {
    for (const article of KB_DOC_ARTICLES) {
      expect(article.body.length).toBeGreaterThanOrEqual(KB_HUMAN_BODY_MIN_CHARS);
      expect(article.body).toContain('## Overview');
      expect(article.body).toMatch(/^## |^This guide|^This article|\*\*/m);
    }
  });

  test('enrichKbHumanBody promotes ### headings to ##', () => {
    const body = enrichKbHumanBody({
      slug: 'test-slug',
      title: 'Test title',
      category: 'Reference',
      tags: [],
      sourcePath: 'docs/test.md',
      body: '### Short section\n\nOne line.',
    });
    expect(body).toContain('## Short section');
    expect(body).not.toMatch(/^### /m);
  });
});
