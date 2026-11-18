import { describe, expect, test } from '@jest/globals';
import { KB_DOC_APP_IDS, KB_DOC_ARTICLES } from '@/apps/knowledge-base/back-end/db/seed-kb-docs';

/**
 * `getAppContext()` reads `appsRepository` in process, so a unit test cannot exercise a
 * populated registry read. These tests pin the mapping *contract* instead — the failure mode
 * that silently breaks `lab_kb_app_context` is an id that does not match the registry.
 *
 * Deliberately structural rather than asserting membership in a hardcoded snapshot: the
 * `apps` table is not fully populated in every environment (catalog apps and some platform
 * apps are registered by separate scripts), so a snapshot assertion fails for reasons that
 * have nothing to do with the KB.
 */

/** Platform host apps use an `app-lab-*` registry prefix; catalog apps do not. */
const PLATFORM_SLUGS = [
  'app-crm',
  'app-task-list',
  'app-help-desk',
  'app-forms-builder',
  'app-chart-builder',
  'app-workflow-studio',
  'app-approvals',
  'app-financial-ledger',
  'app-app-builder',
] as const;

/**
 * Previously `app-lab-chartbuilder` had no registry row despite being a required dependency of
 * Help Desk and Financial Ledger. It is now registered by
 * `AppsRepository.ensureChartBuilderAppRegistered()` and guarded by
 * `platform-app-registry-coverage.test.ts`. Kept empty so a future gap needs an explicit entry.
 */
const KNOWN_UNREGISTERED_APP_IDS = new Set<string>();

describe('KB → registry app id mapping', () => {
  test('platform apps resolve to their app-lab-* registry ids', () => {
    const expected: Record<string, string> = {
      'app-crm': 'app-lab-crm',
      'app-task-list': 'app-lab-tasklist',
      'app-help-desk': 'app-lab-helpdesk',
      'app-forms-builder': 'app-lab-formsbuilder',
      'app-chart-builder': 'app-lab-chartbuilder',
      'app-workflow-studio': 'app-lab-workflow-studio',
      'app-approvals': 'app-lab-approvals-policies',
      'app-financial-ledger': 'app-lab-financial-ledger',
      'app-app-builder': 'app-lab-app-builder',
    };
    for (const slug of PLATFORM_SLUGS) {
      expect({ slug, appId: KB_DOC_APP_IDS[slug] }).toEqual({ slug, appId: expected[slug] });
    }
  });

  test('catalog apps keep their plain registry ids', () => {
    // A blanket `app-lab-` prefix would be wrong for these.
    expect(KB_DOC_APP_IDS['app-okr-goals']).toBe('app-okr-goals');
    expect(KB_DOC_APP_IDS['app-knowledge-base']).toBe('app-knowledge-base');
    expect(KB_DOC_APP_IDS['app-polls-surveys']).toBe('app-polls-surveys');
  });

  test('every app article has a mapping, except the multi-app games overview', () => {
    const appArticles = KB_DOC_ARTICLES.filter((article) => article.category === 'Apps');
    expect(appArticles.length).toBeGreaterThan(20);

    const unmapped = appArticles
      .filter((article) => article.slug !== 'app-games')
      .filter((article) => !article.appId && !KB_DOC_APP_IDS[article.slug])
      .map((article) => article.slug);

    expect(unmapped).toEqual([]);
  });

  test('the games article has no single app id', () => {
    const games = KB_DOC_ARTICLES.find((article) => article.slug === 'app-games');
    expect(games).toBeDefined();
    expect(games?.appId).toBeUndefined();
    expect(KB_DOC_APP_IDS['app-games']).toBeUndefined();
  });

  test('chart builder resolves to the registered app-lab-chartbuilder id', () => {
    // Registry row now exists (ensureChartBuilderAppRegistered), so resolution works.
    expect(KNOWN_UNREGISTERED_APP_IDS.has('app-lab-chartbuilder')).toBe(false);
    expect(KB_DOC_APP_IDS['app-chart-builder']).toBe('app-lab-chartbuilder');
  });

  test('no mapping value is a slug that lacks the app- prefix', () => {
    for (const [slug, appId] of Object.entries(KB_DOC_APP_IDS)) {
      expect({ slug, ok: appId.startsWith('app-') }).toEqual({ slug, ok: true });
    }
  });
});
