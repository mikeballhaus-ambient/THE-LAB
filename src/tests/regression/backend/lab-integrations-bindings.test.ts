import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import {
  LabIntegrationsError,
  labIntegrationsService,
} from '@/backend/db/LabIntegrations/lab-integrations-service';
import type { User } from '@/shared/types/user';
import { setProviderAssetRefValidatorForTests } from '@/backend/lab-integrations/validate-provider-asset-ref';

const hostUpdater: User = {
  userId: 2,
  email: 'u@test',
  name: 'Updater',
  role: 'member',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: {
    global: {},
    app: [{ appId: 'app-lab-tasklist', canLaunch: true, canTeardown: false, canUpdate: true, canViewLogs: false }],
  },
};

const viewer: User = {
  userId: 3,
  email: 'v@test',
  name: 'Viewer',
  role: 'viewer',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

describe('lab-integrations bindings', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    setProviderAssetRefValidatorForTests(async () => {});
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(`INSERT INTO users (id, email, name, role, status) VALUES (2, 'u@test', 'U', 'member', 'active')`).run();
    db.prepare(`INSERT INTO users (id, email, name, role, status) VALUES (3, 'v@test', 'V', 'viewer', 'active')`).run();
    await appsRepository.bootstrap(db);
    await labIntegrationsRepository.bootstrap(db);
    await labIntegrationsRepository.initialize();
  });

  beforeEach(() => {
    labIntegrationsRepository.clearAllForTests();
  });

  afterAll(() => {
    setProviderAssetRefValidatorForTests(null);
    labIntegrationsRepository.close();
    appsRepository.close();
    db.close();
  });

  test('creates and lists binding for host updater', async () => {
    const created = await labIntegrationsService.createBindingForCaller(hostUpdater, {
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'forms-builder',
      providerRef: 'form_key_1',
      config: { schemaVersion: 1, serviceId: 'task-list.tasks' },
    });
    expect(created.slot).toBe('task.create.dialog');
    const list = labIntegrationsService.listBindingsForCaller(hostUpdater, 'app-lab-tasklist');
    expect(list).toHaveLength(1);
  });

  test('rejects duplicate slot', async () => {
    await labIntegrationsService.createBindingForCaller(hostUpdater, {
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'forms-builder',
      providerRef: 'a',
      config: { schemaVersion: 1 },
    });
    await expect(
      labIntegrationsService.createBindingForCaller(hostUpdater, {
        hostAppId: 'app-lab-tasklist',
        slot: 'task.create.dialog',
        kind: 'form.surface',
        providerAppId: 'forms-builder',
        providerRef: 'b',
        config: { schemaVersion: 1 },
      }),
    ).rejects.toThrow(LabIntegrationsError);
  });

  test('viewer cannot configure bindings', async () => {
    await expect(
      labIntegrationsService.createBindingForCaller(viewer, {
        hostAppId: 'app-lab-tasklist',
        slot: 'x',
        kind: 'form.surface',
        providerAppId: 'forms-builder',
        providerRef: 'a',
        config: { schemaVersion: 1 },
      }),
    ).rejects.toThrow(LabIntegrationsError);
  });

  test('updates and deletes binding', async () => {
    const created = await labIntegrationsService.createBindingForCaller(hostUpdater, {
      id: randomUUID(),
      hostAppId: 'app-lab-tasklist',
      slot: 'reports.by-status',
      kind: 'chart.surface',
      providerAppId: 'chart-builder',
      providerRef: 'chart_1',
      config: { schemaVersion: 1 },
    });
    const updated = await labIntegrationsService.updateBindingForCaller(hostUpdater, created.id, {
      providerRef: 'chart_2',
      enabled: false,
    });
    expect(updated.providerRef).toBe('chart_2');
    expect(updated.enabled).toBe(false);
    await labIntegrationsService.deleteBindingForCaller(hostUpdater, created.id);
    expect(labIntegrationsRepository.getById(created.id)).toBeNull();
  });
});
