import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsHubService } from '@/backend/lab-integrations/lab-integrations-hub-service';
import { buildRegistryDiscoveryContract } from '@/backend/lab-integrations/build-registry-discovery-contract';
import {
  CHART_BUILDER_INTEGRATION_MANIFEST,
  HELP_DESK_INTEGRATION_MANIFEST,
  TASK_LIST_INTEGRATION_MANIFEST,
} from '@/backend/db/Apps/integration-manifest-seeds';
import type { User } from '@/shared/types/user';

const admin: User = {
  userId: 1,
  email: 'a@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

describe('lab-integrations hub', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    await appsRepository.bootstrap(db);
  });

  afterAll(() => {
    appsRepository.close();
    db.close();
  });

  test('task list manifest is seeded with integration services', () => {
    const manifest = appsRepository.getIntegrationManifest('app-lab-tasklist');
    expect(manifest?.integrationServices?.length).toBeGreaterThanOrEqual(2);
    expect(manifest?.accepts?.some((slot) => slot.slot === 'reports.by-status')).toBe(true);
  });

  test('chart builder manifest includes designer and data-connector slots', () => {
    const manifest = CHART_BUILDER_INTEGRATION_MANIFEST;
    expect(manifest.accepts?.some((slot) => slot.slot === 'chart.designer.metadata')).toBe(true);
    expect(manifest.accepts?.some((slot) => slot.slot === 'chart.connector.create.dialog')).toBe(true);
    expect(manifest.accepts?.some((slot) => slot.slot === 'chart.create.dialog')).toBe(false);
    expect(manifest.integrationServices?.some((s) => s.serviceId === 'chart-builder.data-connectors')).toBe(
      true,
    );
    expect(manifest.integrationSurfaces?.some((s) => s.surfaceId === 'chart-builder.workspace')).toBe(true);
  });

  test('help desk manifest is seeded with ticket service and chart slots', () => {
    const manifest = appsRepository.getIntegrationManifest('app-lab-helpdesk');
    expect(manifest?.integrationServices?.some((s) => s.serviceId === 'help-desk.tickets')).toBe(
      true,
    );
    expect(manifest?.accepts?.some((slot) => slot.slot === 'ticket.create.dialog')).toBe(true);
    expect(manifest?.integrationServices?.some((s) => s.serviceId === 'help-desk.kanban-boards')).toBe(
      true,
    );
    expect(manifest?.accepts?.some((slot) => slot.slot === 'kanban.board.create.dialog')).toBe(true);
    expect(manifest?.accepts?.some((slot) => slot.slot === 'reports.by-status')).toBe(true);
    expect(manifest?.integrationSurfaces?.[0]?.surfaceId).toBe(
      HELP_DESK_INTEGRATION_MANIFEST.integrationSurfaces?.[0]?.surfaceId,
    );
  });

  test('service catalog lists integration services for enabled apps', () => {
    const catalog = labIntegrationsHubService.listIntegrationServiceCatalogForCaller(admin);
    expect(catalog.schemaVersion).toBe(1);
    const taskList = catalog.apps.find((row) => row.appId === 'app-lab-tasklist');
    expect(taskList?.services.some((s) => s.serviceId === 'task-list.tasks')).toBe(true);
  });

  test('hub returns registry discovery contract for task-list.tasks', () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-tasklist',
      'task-list.tasks',
    );
    expect(contract.entityName).toBe('Task');
    expect(contract.endpoints.crud.getAll.url).toBe('/api/connector/tasks');
    expect(contract.endpoints.baseUrl).toContain(':3005');
  });

  test('buildRegistryDiscoveryContract maps descriptor properties', () => {
    const service = TASK_LIST_INTEGRATION_MANIFEST.integrationServices![0];
    const contract = buildRegistryDiscoveryContract(service, {
      appId: 'app-lab-tasklist',
      serverPort: 3005,
      apiHostBase: 'http://localhost',
    });
    expect(contract.entityModel.properties.some((p) => p.name === 'status')).toBe(true);
    expect(contract.endpoints.crud.getAll.filter).toBe('taskListId');
  });
});
