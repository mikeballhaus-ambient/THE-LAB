import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { AppsRepository } from '@/backend/db/Apps/apps-repository';
import {
  LAB_APPROVALS_APP_ID,
  LAB_APP_BUILDER_APP_ID,
  LAB_CHART_BUILDER_APP_ID,
  LAB_CRM_APP_ID,
  LAB_FORMS_BUILDER_APP_ID,
  LAB_HELP_DESK_APP_ID,
  LAB_KNOWLEDGE_BASE_APP_ID,
  LAB_LEDGER_APP_ID,
  LAB_PRODUCT_APP_IDS,
  LAB_TASK_LIST_APP_ID,
  LAB_WORKFLOW_STUDIO_APP_ID,
} from '@/shared/config/platform-lab-product-app-ids';
import { PROTECTED_PLATFORM_APP_IDS } from '@/shared/types/app/protected-apps';

/**
 * Registry coverage guard.
 *
 * App registry metadata is authored in code so fresh installs and existing databases converge
 * on boot. Every `LAB_*_APP_ID` constant and every entry in `PROTECTED_PLATFORM_APP_IDS` must
 * therefore be materialised by `AppsRepository.initialize()` — otherwise the app cannot launch
 * and every `UPDATE ... WHERE id = ?` targeting it silently matches zero rows.
 *
 * This is the regression that hid Chart Builder: it had a complete app folder, seeded charts
 * and 11 core references, but no code path ever inserted its row.
 */

async function bootRepository(): Promise<{
  repo: AppsRepository;
  db: Database.Database;
}> {
  const db = new Database(':memory:');
  const repo = new AppsRepository();
  await repo.bootstrap(db);
  return { repo, db };
}

describe('platform app registry coverage', () => {
  test('every LAB_*_APP_ID constant is registered on boot', async () => {
    const { repo, db } = await bootRepository();
    const constants = [
      LAB_CRM_APP_ID,
      LAB_HELP_DESK_APP_ID,
      LAB_TASK_LIST_APP_ID,
      LAB_FORMS_BUILDER_APP_ID,
      LAB_CHART_BUILDER_APP_ID,
      LAB_APP_BUILDER_APP_ID,
      LAB_KNOWLEDGE_BASE_APP_ID,
      LAB_WORKFLOW_STUDIO_APP_ID,
      LAB_APPROVALS_APP_ID,
      LAB_LEDGER_APP_ID,
    ];

    const missing = constants.filter((id) => !repo.getAppsById(id));
    expect(missing).toEqual([]);
    db.close();
  });

  test('every LAB_PRODUCT_APP_IDS entry is registered on boot', async () => {
    const { repo, db } = await bootRepository();
    const missing = LAB_PRODUCT_APP_IDS.filter((id) => !repo.getAppsById(id));
    expect(missing).toEqual([]);
    db.close();
  });

  test('every protected platform app id is registered on boot', async () => {
    const { repo, db } = await bootRepository();
    const missing = PROTECTED_PLATFORM_APP_IDS.filter((id) => !repo.getAppsById(id));
    expect(missing).toEqual([]);
    db.close();
  });

  test('Chart Builder is registered as a launchable hybrid server app', async () => {
    const { repo, db } = await bootRepository();
    const app = repo.getAppsById(LAB_CHART_BUILDER_APP_ID);

    expect(app).toBeDefined();
    expect(app?.type).toBe('hybrid');
    expect(app?.requiresPort).toBe(3013);
    expect(app?.isEnabled).toBe(true);
    expect(app?.isServerSideEnabled).toBe(true);
    // Platform app: delete via App Management must be blocked.
    expect(app?.isSystem).toBe(true);
    expect(app?.componentPath).toBe('/src/apps/lab-chartbuilder/front-end/App.vue');
    // The designer's forms are Forms Builder-backed.
    expect(app?.dependencies).toContain(LAB_FORMS_BUILDER_APP_ID);
    // Seeded instructions must exist, or lab_kb_app_context returns an empty body.
    expect(app?.appSystemInstructions?.length).toBeGreaterThan(200);
    db.close();
  });

  test('registration is idempotent — a second boot does not duplicate rows', async () => {
    const db = new Database(':memory:');
    const first = new AppsRepository();
    await first.bootstrap(db);

    const countAfterFirst = (
      db.prepare(`SELECT COUNT(*) AS n FROM apps`).get() as { n: number }
    ).n;

    const second = new AppsRepository();
    await second.bootstrap(db);
    const countAfterSecond = (
      db.prepare(`SELECT COUNT(*) AS n FROM apps`).get() as { n: number }
    ).n;

    expect(countAfterSecond).toBe(countAfterFirst);
    db.close();
  });

  test('a pre-existing Chart Builder row is left alone', async () => {
    const db = new Database(':memory:');
    const bootstrapRepo = new AppsRepository();
    await bootstrapRepo.bootstrap(db);

    // Simulate a user-customised row, then boot again.
    db.prepare(`UPDATE apps SET description = ? WHERE id = ?`).run(
      'Locally customised description',
      LAB_CHART_BUILDER_APP_ID,
    );

    const second = new AppsRepository();
    await second.bootstrap(db);

    const row = db
      .prepare(`SELECT description FROM apps WHERE id = ?`)
      .get(LAB_CHART_BUILDER_APP_ID) as { description: string } | undefined;
    // ensureChartBuilderAppRegistered returns early when the row exists; only the
    // instructions/order syncs are allowed to touch it.
    expect(row?.description).toBe('Locally customised description');
    db.close();
  });
});
