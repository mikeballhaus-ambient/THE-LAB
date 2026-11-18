import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { APP_SEED_BOOT_FLAG_KEYS } from '@/shared/config/app-seed-boot-flags';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';
import { KB_DEMO_ARTICLE_BODIES } from './kb-demo-article-bodies';
import { enrichKbDemoBody } from './kb-demo-prose-builder';

export const KB_DEMO_PACK_ID = 'kb-demo';
export const KB_DEMO_BOOT_FLAG = APP_SEED_BOOT_FLAG_KEYS.KNOWLEDGE_BASE_DEMO;

interface ArticleSpec {
  title: string;
  category: string;
  tags: string;
  status: 'draft' | 'published' | 'archived';
  author: string;
  body: string;
  dayOffset: number;
}

/**
 * Six illustrative articles for the demo pack.
 *
 * This is **not** the lab's real documentation hub — that is a separate, larger seed
 * (`seed-kb-docs.ts`, §30.8). These rows exist so catalog dashboards, the
 * `reports.articles-by-category` chart and the Forms Builder picker have data.
 */
const ARTICLES_RAW: readonly ArticleSpec[] = [
  {
    title: 'Linking Help Desk tickets to CRM contacts',
    category: 'Integrations',
    tags: 'help-desk,crm,contacts',
    status: 'published',
    author: 'Sam Patel',
    body: KB_DEMO_ARTICLE_BODIES.helpDeskCrm,
    dayOffset: -30,
  },
  {
    title: 'Building your first chart binding',
    category: 'Integrations',
    tags: 'chart-builder,bindings,dashboards',
    status: 'published',
    author: 'Mia Chen',
    body: KB_DEMO_ARTICLE_BODIES.chartBinding,
    dayOffset: -24,
  },
  {
    title: 'How demo seed packs work',
    category: 'Platform',
    tags: 'seeding,demo-data,settings',
    status: 'published',
    author: 'Mia Chen',
    body: KB_DEMO_ARTICLE_BODIES.demoSeeds,
    dayOffset: -18,
  },
  {
    title: 'Theming tokens: --lab-* surfaces',
    category: 'Platform',
    tags: 'theming,tokens,tailwind',
    status: 'published',
    author: 'Casey Hayes',
    body: KB_DEMO_ARTICLE_BODIES.theming,
    dayOffset: -12,
  },
  {
    title: 'Roles and what each one can launch',
    category: 'Getting started',
    tags: 'roles,permissions,access',
    status: 'published',
    author: 'Taylor Nguyen',
    body: KB_DEMO_ARTICLE_BODIES.roles,
    dayOffset: -6,
  },
  {
    title: 'Draft: offline mode exploration',
    category: 'Platform',
    tags: 'draft,offline',
    status: 'draft',
    author: 'Drew Ward',
    body: KB_DEMO_ARTICLE_BODIES.draftOffline,
    dayOffset: -3,
  },
];

const ARTICLES: readonly ArticleSpec[] = ARTICLES_RAW.map((article) => ({
  ...article,
  body: enrichKbDemoBody(article),
}));

export function hasKbDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, KB_DEMO_PACK_ID).has();
}

export interface SeedKbDemoOptions {
  adminApply?: boolean;
}

export interface SeedKbDemoResult {
  inserted: number;
}

/** Refresh demo article bodies when seed copy changes (does not touch `docs:` hub rows). */
export function reconcileKbDemoArticles(db: Database): number {
  const byTitle = db.prepare(`SELECT id FROM kb_articles WHERE title = ? LIMIT 1`);
  const update = db.prepare(
    `UPDATE kb_articles SET body = ?, updated_at = ? WHERE id = ?`,
  );
  let updated = 0;
  for (const article of ARTICLES) {
    const row = byTitle.get(article.title) as { id: number } | undefined;
    if (!row) {
      continue;
    }
    update.run(article.body, `${DEMO_TODAY}T09:30:00`, row.id);
    updated += 1;
  }
  return updated;
}

export function seedKbDemoIfMissing(db: Database, options?: SeedKbDemoOptions): SeedKbDemoResult {
  const ledger = new DemoSeedLedger(db, KB_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, KB_DEMO_BOOT_FLAG, options)) {
    reconcileKbDemoArticles(db);
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'kb_articles', 'author_id');

  let inserted = 0;

  for (const article of ARTICLES) {
    const created = shiftDemoDate(DEMO_TODAY, article.dayOffset);
    const id = insertRow(db, 'kb_articles', {
      title: article.title,
      category: article.category,
      tags: article.tags,
      body: article.body,
      status: article.status,
      author: article.author,
      author_id: demoCastIdForName(article.author),
      created_at: `${created}T09:30:00`,
      updated_at: `${DEMO_TODAY}T09:30:00`,
    });
    ledger.track('kb_articles', id);
    inserted += 1;
  }

  reconcileKbDemoArticles(db);
  return { inserted };
}

export function removeKbDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, KB_DEMO_PACK_ID);
  return ledger.deleteTracked(['kb_articles']);
}

/** Every article status represented by the demo data (rule 6). */
export function kbDemoStatuses(): string[] {
  return [...new Set(ARTICLES.map((article) => article.status))];
}

/** Categories the demo articles are filed under. */
export function kbDemoCategories(): string[] {
  return [...new Set(ARTICLES.map((article) => article.category))];
}

/** Cast authors referenced by this seed. */
export function kbDemoAuthors(): string[] {
  return [...new Set(ARTICLES.map((article) => article.author))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const kbDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: KB_DEMO_BOOT_FLAG,
  has: hasKbDemoDataset,
  seed: seedKbDemoIfMissing,
};
