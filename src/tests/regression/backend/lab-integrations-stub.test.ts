import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import {
  defaultFormKeyForStub,
  provisionFormStubInFormsBuilderDb,
} from '@/backend/lab-integrations/lab-integrations-form-stub-provisioner';
import {
  defaultChartKeyForStub,
  provisionChartStubInChartBuilderDb,
} from '@/backend/lab-integrations/lab-integrations-chart-stub-provisioner';
import { DataConnectorsRepository as ChartDataConnectorsRepository, ChartsRepository } from '@/apps/lab-chartbuilder/db/repositories';
import { labIntegrationsHubService } from '@/backend/lab-integrations/lab-integrations-hub-service';
import { DataConnectorsRepository, FormsRepository } from '@/apps/lab-formsbuilder/db/repositories';
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

function bootstrapFormsDb(db: betterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE data_connectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      entity_name TEXT NOT NULL,
      discovery_url TEXT NOT NULL,
      discovery_type TEXT DEFAULT 'GET',
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

describe('lab-integrations stub provision', () => {
  let mainDb: betterSqlite3.Database;
  let formsDb: betterSqlite3.Database;
  let chartsDb: betterSqlite3.Database;
  let connectors: DataConnectorsRepository;
  let forms: FormsRepository;
  let chartConnectors: ChartDataConnectorsRepository;
  let charts: ChartsRepository;

  beforeAll(async () => {
    mainDb = betterSqlite3(':memory:');
    await appsRepository.bootstrap(mainDb);

    formsDb = betterSqlite3(':memory:');
    bootstrapFormsDb(formsDb);
    connectors = new DataConnectorsRepository(formsDb);
    forms = new FormsRepository(formsDb);

    chartsDb = betterSqlite3(':memory:');
    bootstrapChartsDb(chartsDb);
    chartConnectors = new ChartDataConnectorsRepository(chartsDb);
    charts = new ChartsRepository(chartsDb);
  });

  afterAll(() => {
    appsRepository.close();
    mainDb.close();
    formsDb.close();
    chartsDb.close();
  });

  test('defaultFormKeyForStub is deterministic', () => {
    expect(defaultFormKeyForStub('app-lab-tasklist', 'task-list.tasks', 'task.create.dialog')).toBe(
      'lab-tasklist.task-list.tasks.task-create-dialog',
    );
  });

  test('provisionFormStubInFormsBuilderDb creates connector and published form', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
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

    expect(result.created).toBe(true);
    expect(result.fieldCount).toBeGreaterThan(3);
    expect(result.formKey).toContain('task-list');

    const saved = await forms.findByKey(result.formKey);
    expect(saved?.components?.some((c) => c.fieldKey === 'title')).toBe(true);
    expect(saved?.components?.find((c) => c.fieldKey === 'title')?.required).toBe(true);
    const statusField = saved?.components?.find((c) => c.fieldKey === 'status');
    expect(statusField?.type).toBe('Select');
    expect(statusField?.dataFetch?.forProperty).toBe('status');
    const priorityField = saved?.components?.find((c) => c.fieldKey === 'priority');
    expect(priorityField?.type).toBe('Select');
    const tagsField = saved?.components?.find((c) => c.fieldKey === 'tags');
    expect(tagsField?.type).toBe('MultiSelect');
    expect(saved?.components?.some((c) => c.fieldKey === 'taskListId')).toBe(true);
    expect(saved?.validationRules?.title?.some((r) => r.rule === 'required')).toBe(true);
    expect(saved?.dataConnecter?.appName).toBe('lab-tasklist');
    expect(saved?.dataConnecter?.discoveryUrl).toContain('/hub/app-lab-tasklist/services/task-list.tasks/discovery');
  });

  test('provisionFormStubInFormsBuilderDb creates delete confirm stub', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-tasklist',
      'task-list.tasks',
    );

    const result = await provisionFormStubInFormsBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'task.delete.dialog',
        publish: true,
        overwrite: false,
        contract,
        formName: 'Delete task',
      },
      { connectors, forms },
    );

    expect(result.created).toBe(true);
    const saved = await forms.findByKey(result.formKey);
    expect(saved?.components?.[0]?.type).toBe('Label');
    expect(saved?.formActions?.updateLabel).toBe('Delete');
    expect(saved?.validationRules).toEqual({});
  });

  test('overwrite replaces stale InputText with lookup controls', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-tasklist',
      'task-list.tasks',
    );
    const formKey = 'test.stub.overwrite-types';

    await provisionFormStubInFormsBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'task.create.dialog',
        suggestedFormKey: formKey,
        publish: true,
        overwrite: false,
        contract,
        formName: 'Create task',
      },
      { connectors, forms },
    );

    const existing = await forms.findByKey(formKey);
    expect(existing?.id).toBeDefined();
    if (!existing?.id) {
      throw new Error('expected form');
    }

    await forms.update(existing.id, {
      components: (existing.components ?? []).map((c) =>
        c.fieldKey === 'status' || c.fieldKey === 'priority' || c.fieldKey === 'assigneeId'
          ? { ...c, type: 'InputText', dataFetch: undefined }
          : c,
      ),
    });

    const result = await provisionFormStubInFormsBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'task.create.dialog',
        suggestedFormKey: formKey,
        publish: true,
        overwrite: true,
        contract,
        formName: 'Create task',
      },
      { connectors, forms },
    );

    expect(result.created).toBe(false);
    const saved = await forms.findByKey(formKey);
    expect(saved?.components?.find((c) => c.fieldKey === 'status')?.type).toBe('Select');
    expect(saved?.components?.find((c) => c.fieldKey === 'priority')?.type).toBe('Select');
    expect(saved?.components?.find((c) => c.fieldKey === 'assigneeId')?.type).toBe('Select');
  });

  test('provisionFormStubInFormsBuilderDb conflicts without overwrite', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-tasklist',
      'task-list.tasks',
    );
    const formKey = 'test.stub.conflict';

    await provisionFormStubInFormsBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'task.edit.dialog',
        suggestedFormKey: formKey,
        publish: true,
        overwrite: false,
        contract,
        formName: 'Edit task',
      },
      { connectors, forms },
    );

    await expect(
      provisionFormStubInFormsBuilderDb(
        {
          hostAppId: 'app-lab-tasklist',
          serviceId: 'task-list.tasks',
          slot: 'task.edit.dialog',
          suggestedFormKey: formKey,
          publish: true,
          overwrite: false,
          contract,
          formName: 'Edit task',
        },
        { connectors, forms },
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  test('defaultChartKeyForStub is deterministic', () => {
    expect(defaultChartKeyForStub('app-lab-tasklist', 'task-list.tasks', 'reports.by-status')).toBe(
      'lab-tasklist.task-list.tasks.reports-by-status',
    );
  });

  test('provisionChartStubInChartBuilderDb creates connector and status aggregate chart', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-tasklist',
      'task-list.tasks',
    );

    const result = await provisionChartStubInChartBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'reports.by-status',
        publish: false,
        overwrite: false,
        contract,
        chartName: 'Tasks by status',
      },
      { connectors: chartConnectors, charts },
    );

    expect(result.created).toBe(true);
    expect(result.chartKey).toContain('reports-by-status');

    const saved = charts.findByKey(result.chartKey);
    expect(saved?.chartType).toBe('bar');
    expect(saved?.dataMapping?.mode).toBe('aggregate');
    if (saved?.dataMapping?.mode === 'aggregate') {
      expect(saved.dataMapping.groupByField).toBe('status');
    }
    expect(saved?.allowedFilters?.some((f) => f.contextKey === 'taskListId' && f.required)).toBe(true);
    const connector = chartConnectors.findById(result.connectorId);
    expect(connector?.discoveryUrl).toContain('/api/discovery/task');
  });

  test('provisionChartStubInChartBuilderDb maps priority slot to priority field', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-tasklist',
      'task-list.tasks',
    );

    const result = await provisionChartStubInChartBuilderDb(
      {
        hostAppId: 'app-lab-tasklist',
        serviceId: 'task-list.tasks',
        slot: 'reports.by-priority',
        publish: false,
        overwrite: false,
        contract,
        chartName: 'Tasks by priority',
      },
      { connectors: chartConnectors, charts },
    );

    const saved = charts.findByKey(result.chartKey);
    if (saved?.dataMapping?.mode === 'aggregate') {
      expect(saved.dataMapping.groupByField).toBe('priority');
    }
  });

  test('provisionChartStubInChartBuilderDb for help-desk tickets does not require taskListId', async () => {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      admin,
      'app-lab-helpdesk',
      'help-desk.tickets',
    );

    const result = await provisionChartStubInChartBuilderDb(
      {
        hostAppId: 'app-lab-helpdesk',
        serviceId: 'help-desk.tickets',
        slot: 'reports.by-status',
        publish: false,
        overwrite: true,
        contract,
        chartName: 'Tickets by status',
      },
      { connectors: chartConnectors, charts },
    );

    const saved = charts.findByKey(result.chartKey);
    expect(saved?.allowedFilters ?? []).toEqual([]);
    expect(contract.endpoints.crud.getAll.filter).toBeUndefined();
  });
});

function bootstrapChartsDb(db: betterSqlite3.Database): void {
  db.exec(`
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
}
