import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import { labIntegrationsService } from '@/backend/db/LabIntegrations/lab-integrations-service';
import { labIntegrationsDependencyCoordinator } from '@/backend/lab-integrations/lab-integrations-dependency-coordinator';
import { resolveLaunchDependencyIds } from '@/shared/lab-integrations/resolve-launch-dependencies';
import type { User } from '@/shared/types/user';
import { setProviderAssetRefValidatorForTests } from '@/backend/lab-integrations/validate-provider-asset-ref';

const hostUpdater: User = {
  userId: 2,
  email: 'u@test',
  name: 'Updater',
  role: 'admin',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

describe('lab-integrations launch dependencies', () => {
  let mainDb: betterSqlite3.Database;

  beforeAll(async () => {
    setProviderAssetRefValidatorForTests(async () => {});
    mainDb = betterSqlite3(':memory:');
    mainDb.exec(createUsersTable);
    mainDb.prepare(`INSERT INTO users (id, email, name, role, status) VALUES (2, 'u@test', 'U', 'admin', 'active')`).run();
    await appsRepository.bootstrap(mainDb);
    await labIntegrationsRepository.bootstrap(mainDb);
    await labIntegrationsRepository.initialize();
  });

  beforeEach(() => {
    labIntegrationsRepository.clearAllForTests();
  });

  afterAll(() => {
    setProviderAssetRefValidatorForTests(null);
    appsRepository.close();
    labIntegrationsRepository.close();
    mainDb.close();
  });

  test('resolveLaunchDependencyIds unions registry deps and enabled bindings', () => {
    const host = appsRepository.getAppsById('app-lab-tasklist');
    expect(host).toBeDefined();
    const merged = resolveLaunchDependencyIds(
      host!.dependencies ?? [],
      [
        {
          id: 'b1',
          hostAppId: 'app-lab-tasklist',
          slot: 'reports.by-status',
          kind: 'chart.surface',
          providerAppId: 'app-lab-chartbuilder',
          providerRef: 'c1',
          config: { schemaVersion: 1 },
          enabled: true,
          createdByUserId: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
      'app-lab-tasklist',
    );
    expect(merged).toContain('app-lab-formsbuilder');
    expect(merged).toContain('app-lab-chartbuilder');
    expect(merged.indexOf('app-lab-formsbuilder')).toBeLessThan(merged.indexOf('app-lab-chartbuilder'));
  });

  test('promote on bind adds chart-builder; demote on delete removes only promoted dep', async () => {
    const before = appsRepository.getAppsById('app-lab-tasklist');
    expect(before?.dependencies).toContain('app-lab-formsbuilder');
    expect(before?.dependencies).not.toContain('app-lab-chartbuilder');

    await labIntegrationsService.createBindingForCaller(hostUpdater, {
      hostAppId: 'app-lab-tasklist',
      slot: 'reports.by-status',
      kind: 'chart.surface',
      providerAppId: 'app-lab-chartbuilder',
      providerRef: 'chart_1',
      config: { schemaVersion: 1 },
    });

    const afterBind = appsRepository.getAppsById('app-lab-tasklist');
    expect(afterBind?.dependencies).toContain('app-lab-chartbuilder');
    expect(afterBind?.metadata?.integrationPromotedDeps).toContain('app-lab-chartbuilder');

    const binding = labIntegrationsRepository.listByHost('app-lab-tasklist')[0];
    await labIntegrationsService.deleteBindingForCaller(hostUpdater, binding.id);

    const afterDelete = appsRepository.getAppsById('app-lab-tasklist');
    expect(afterDelete?.dependencies).not.toContain('app-lab-chartbuilder');
    expect(afterDelete?.dependencies).toContain('app-lab-formsbuilder');
  });

  test('getLaunchDependencyIds matches resolve helper', async () => {
    await labIntegrationsService.createBindingForCaller(hostUpdater, {
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'app-lab-formsbuilder',
      providerRef: 'f1',
      config: { schemaVersion: 1 },
    });
    const fromCoordinator = labIntegrationsDependencyCoordinator.getLaunchDependencyIds('app-lab-tasklist');
    expect(fromCoordinator).toContain('app-lab-formsbuilder');
  });
});
