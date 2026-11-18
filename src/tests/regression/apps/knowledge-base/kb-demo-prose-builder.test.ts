import { describe, expect, test } from '@jest/globals';
import { KB_HUMAN_BODY_MIN_CHARS } from '@/apps/knowledge-base/back-end/db/kb-doc-prose-builder';
import { enrichKbDemoBody } from '@/apps/knowledge-base/back-end/db/kb-demo-prose-builder';
import { KB_DEMO_ARTICLE_BODIES } from '@/apps/knowledge-base/back-end/db/kb-demo-article-bodies';

describe('kb-demo-prose-builder', () => {
  test('demo articles enrich to full sectioned bodies', () => {
    const body = enrichKbDemoBody({
      title: 'Building your first chart binding',
      category: 'Integrations',
      tags: 'chart-builder',
      body: KB_DEMO_ARTICLE_BODIES.chartBinding,
    });
    expect(body.length).toBeGreaterThanOrEqual(KB_HUMAN_BODY_MIN_CHARS);
    expect(body).toContain('## Overview');
    expect(body).toContain('## In practice');
  });
});
