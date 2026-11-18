import type { KbDocCategory } from './seed-kb-docs';
import { enrichKbHumanBody } from './kb-doc-prose-builder';

export interface KbDemoArticleSpec {
  title: string;
  category: string;
  tags: string;
  body: string;
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Demo pack articles use the same human prose enricher as the docs hub. */
export function enrichKbDemoBody(article: KbDemoArticleSpec): string {
  return enrichKbHumanBody({
    slug: slugFromTitle(article.title),
    title: article.title,
    category: article.category as KbDocCategory,
    tags: article.tags.split(',').map((t) => t.trim()).filter(Boolean),
    sourcePath: 'src/apps/knowledge-base/back-end/db/seed-kb-demo.ts',
    body: article.body,
  });
}
