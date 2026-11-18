import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { AppsRepository } from '@/backend/db/Apps/apps-repository';

describe('AppsRepository.updateAppsEnabled', () => {
  test('persists is_enabled and blocks disabling system apps', async () => {
    const db = new Database(':memory:');
    const repo = new AppsRepository();
    await repo.bootstrap(db);

    const all = repo.getAllApps();
    expect(all.length).toBeGreaterThan(0);

    const catalogApp = all.find((app) => !app.isSystem);
    expect(catalogApp).toBeDefined();

    const systemApp = all.find((app) => app.isSystem);
    expect(systemApp).toBeDefined();

    const ok = repo.updateAppsEnabled({ [catalogApp!.id]: false });
    expect(ok.success).toBe(true);
    expect(repo.getAppsById(catalogApp!.id)?.isEnabled).toBe(false);

    const blocked = repo.updateAppsEnabled({ [systemApp!.id]: false });
    expect(blocked.success).toBe(false);
    expect(repo.getAppsById(systemApp!.id)?.isEnabled).toBe(true);

    db.close();
  });
});