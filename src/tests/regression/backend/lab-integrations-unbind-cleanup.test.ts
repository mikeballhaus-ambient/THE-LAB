import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import { cleanupProviderAssetsAfterUnbind } from '@/backend/lab-integrations/lab-integrations-provider-cleanup';
import { cleanupFormsBuilderStubFromRepos } from '@/backend/lab-integrations/providers/forms-builder-unbind-provider';
import { cleanupChartBuilderStubFromRepos } from '@/backend/lab-integrations/providers/chart-builder-unbind-provider';
import { INTEGRATION_STUB_DESCRIPTION_MARKER } from '@/shared/lab-integrations/integration-stub-markers';
import { provisionFormStubInFormsBuilderDb } from '@/backend/lab-integrations/lab-integrations-form-stub-provisioner';
import { labIntegrationsHubService } from '@/backend/lab-integrations/lab-integrations-hub-service';
import { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
import { ChartsRepository, DataConnectorsRepository as ChartDataConnectorsRepository } from '@/apps/lab-chartbuilder/db/repositories';
import type { User } from '@/shared/types/user';

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

function bootstrapFormsDb(db: betterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE data_connectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      discovery_url TEXT NOT NULL,
      discovery_type TEXT DEFAULT 'REST',
      entity_model TEXT,
      endpoints TEXT,
      capabilities TEXT,
      is_active INTEGER DEFAULT 1,
      last_verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      data_connector_id INTEGER REFERENCES data_connectors(id),
      schema_json TEXT NOT NULL,
      components_json TEXT NOT NULL,
      validation_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

describe('lab-integrations unbind provider cleanup', () => {
  let mainDb: betterSqlite3.Database;
  let formsDb: betterSqlite3.Database;
  let connectors: DataConnectorsRepository;
  let forms: FormsRepository;

  beforeAll(async () => {
    mainDb = betterSqlite3(':memory:');
    mainDb.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, role TEXT, status TEXT)`);
    mainDb.prepare(`INSERT INTO users (id, email, name, role, status) VALUES (2, 'u@test', 'U', 'admin', 'active')`).run();
    await appsRepository.bootstrap(mainDb);
    await labIntegrationsRepository.bootstrap(mainDb);
    await labIntegrationsRepository.initialize();

    formsDb = betterSqlite3(':memory:');
    bootstrapFormsDb(formsDb);
    connectors = new DataConnectorsRepository(formsDb);
    forms = new FormsRepository(formsDb);
  });

  afterAll(() => {
    labIntegrationsRepository.close();
    appsRepository.close();
    mainDb.close();
    formsDb.close();
  });

  test('cleanupFormsBuilderStubFromRepos deletes rm-64 stub and orphan connector', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      hostUpdater,
      'app-lab-tasklist',
      'task-list.tasks',
    );
    const result = await provisionFormStubInFormsBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'task.create.dialog',
        publish: true,
        overwrite: false,
        contract,
        formName: 'Create task',
      },
      { connectors, forms },
    );

    const cleanup = await cleanupFormsBuilderStubFromRepos(
      { forms, connectors, db: formsDb },
      result.formKey,
    );
    expect(cleanup.skipped).toBe(false);
    expect(cleanup.assetDeleted).toBe(true);
    expect(cleanup.connectorDeleted).toBe(true);
    expect(await forms.findByKey(result.formKey)).toBeNull();
  });

  test('skips cleanup while another binding still references providerRef', async () => {
    labIntegrationsRepository.clearAllForTests();
    labIntegrationsRepository.insertBinding({
      id: randomUUID(),
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'forms-builder',
      providerRef: 'shared-form-key',
      configJson: JSON.stringify({ schemaVersion: 1 }),
      enabled: true,
      createdByUserId: 2,
    });
    labIntegrationsRepository.insertBinding({
      id: randomUUID(),
      hostAppId: 'app-lab-crm',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'forms-builder',
      providerRef: 'shared-form-key',
      configJson: JSON.stringify({ schemaVersion: 1 }),
      enabled: true,
      createdByUserId: 2,
    });
    expect(labIntegrationsRepository.countByProviderRef('shared-form-key')).toBe(2);
  });

  test('cleanupProviderAssetsAfterUnbind runs registry handler after last binding removed', async () => {
    labIntegrationsRepository.clearAllForTests();
    const bindingId = randomUUID();
    const providerRef = 'orphan-form-key-dispatch-test';
    labIntegrationsRepository.insertBinding({
      id: bindingId,
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'app-lab-formsbuilder',
      providerRef,
      configJson: JSON.stringify({ schemaVersion: 1 }),
      enabled: true,
      createdByUserId: 2,
    });
    labIntegrationsRepository.deleteBinding(bindingId);

    const cleanup = await cleanupProviderAssetsAfterUnbind({
      id: bindingId,
      hostAppId: 'app-lab-tasklist',
      slot: 'task.create.dialog',
      kind: 'form.surface',
      providerAppId: 'app-lab-formsbuilder',
      providerRef,
      config: { schemaVersion: 1 },
      enabled: true,
      createdByUserId: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(cleanup.skipReason).toBe('asset_not_found');
    expect(cleanup.skipped).toBe(true);
  });
});

describe('chart-builder unbind provider cleanup', () => {
  let chartsDb: betterSqlite3.Database;
  let chartConnectors: ChartDataConnectorsRepository;
  let charts: ChartsRepository;

  beforeAll(() => {
    chartsDb = betterSqlite3(':memory:');
    chartsDb.exec(`
      CREATE TABLE data_connectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        discovery_url TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chart_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        chart_type TEXT NOT NULL,
        options_json TEXT,
        layout_json TEXT,
        is_active INTEGER DEFAULT 1,
        data_connector_id INTEGER REFERENCES data_connectors(id),
        data_mapping_json TEXT,
        allowed_filters_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    chartConnectors = new ChartDataConnectorsRepository(chartsDb);
    charts = new ChartsRepository(chartsDb);
  });

  afterAll(() => {
    chartsDb.close();
  });

  test('cleanupChartBuilderStubFromRepos deletes rm-64 stub and orphan connector', () => {
    const connector = chartConnectors.create({
      appName: 'task-list',
      entityName: 'tasks',
      discoveryUrl: 'http://localhost:3000/api/platform/lab-integrations/hub/app-lab-tasklist/task-list.tasks',
    });
    charts.create({
      chartKey: 'task-list.task-list.tasks-chart',
      name: 'Tasks chart',
      description: `Integration stub ${INTEGRATION_STUB_DESCRIPTION_MARKER}`,
      chartType: 'bar',
      dataConnectorId: connector.id,
      options: {},
      is_active: true,
    });

    const cleanup = cleanupChartBuilderStubFromRepos(
      { charts, connectors: chartConnectors, db: chartsDb },
      'task-list.task-list.tasks-chart',
    );
    expect(cleanup.skipped).toBe(false);
    expect(cleanup.assetDeleted).toBe(true);
    expect(cleanup.connectorDeleted).toBe(true);
    expect(charts.findByKey('task-list.task-list.tasks-chart')).toBeNull();
  });
});
