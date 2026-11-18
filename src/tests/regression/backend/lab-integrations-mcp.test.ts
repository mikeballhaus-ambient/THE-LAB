import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { UserService } from '@/backend/db/Auth/auth-service';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import {
  labIntegrationsGetManifest,
  labIntegrationsListBindings,
  labIntegrationsResolveLaunchDeps,
} from '@/backend/mcp/mcp-servers/lab-integrations/utils/lab-integrations-mcp-handlers';
import type { User } from '@/shared/types/user';
import { randomUUID } from 'node:crypto';
import { setProviderAssetRefValidatorForTests } from '@/backend/lab-integrations/validate-provider-asset-ref';

const adminUser: User = {
  userId: 1,
  email: 'admin@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

describe('lab-integrations MCP handlers', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(`INSERT INTO users (id, email, name, role, status) VALUES (1, 'admin@test', 'Admin', 'admin', 'active')`).run();
    jest.spyOn(UserService.getInstance(), 'getUserById').mockImplementation((id: number) => {
      if (id === adminUser.userId) {
        return adminUser;
      }
      return null;
    });
    await appsRepository.bootstrap(db);
    await labIntegrationsRepository.bootstrap(db);
    await labIntegrationsRepository.initialize();
  });

  afterAll(() => {
    jest.restoreAllMocks();
    appsRepository.close();
    labIntegrationsRepository.close();
    db.close();
  });

  test('get_manifest returns task-list integration manifest for admin user', async () => {
    const result = await labIntegrationsGetManifest({ userId: 1, hostAppId: 'app-lab-tasklist' });
    expect(result.success).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.manifest?.integrationServices?.length).toBeGreaterThan(0);
  });

  test('list_bindings returns empty array when none exist', async () => {
    labIntegrationsRepository.clearAllForTests();
    const result = await labIntegrationsListBindings({ userId: 1, hostAppId: 'app-lab-tasklist' });
    expect(result.success).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.bindings).toEqual([]);
    expect(payload.readinessSummary.missingProviderAsset).toBe(0);
  });

  test('list_bindings flags missing provider stubs', async () => {
    setProviderAssetRefValidatorForTests(async () => {
      throw new Error('missing');
    });
    labIntegrationsRepository.clearAllForTests();
    labIntegrationsRepository.insertBinding({
      id: randomUUID(),
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'app-lab-formsbuilder',
      providerRef: 'task-list.task-list.tasks.task-create-dialog',
      configJson: JSON.stringify({ schemaVersion: 1 }),
      enabled: true,
      createdByUserId: 1,
    });
    const result = await labIntegrationsListBindings({ userId: 1, hostAppId: 'app-lab-tasklist' });
    setProviderAssetRefValidatorForTests(null);
    expect(result.success).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.readinessSummary.missingProviderAsset).toBe(1);
    expect(payload.bindingReadiness[0].readiness).toBe('missing_provider_asset');
    expect(payload.bindingReadiness[0].providerAssetExists).toBe(false);
  });

  test('resolve_launch_deps includes seed forms-builder dependency', async () => {
    const result = await labIntegrationsResolveLaunchDeps({ userId: 1, hostAppId: 'app-lab-tasklist' });
    expect(result.success).toBe(true);
    const payload = JSON.parse(result.content);
    expect(payload.dependencyAppIds).toContain('app-lab-formsbuilder');
  });

  test('unknown userId fails closed', async () => {
    const result = await labIntegrationsGetManifest({ userId: 99999, hostAppId: 'app-lab-tasklist' });
    expect(result.success).toBe(false);
    expect(result.content).toContain('User not found');
  });
});
