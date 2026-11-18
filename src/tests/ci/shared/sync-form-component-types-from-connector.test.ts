import { describe, expect, test } from '@jest/globals';
import type { DataConnector, FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { buildTaskEntityLookupContracts } from '@/shared/lab-integrations/task-list-task-lookup-contracts';
import { syncFormComponentTypesFromConnector } from '@/shared/forms/sync-form-component-types-from-connector';
import { normalizeRuntimeFieldTypes } from '@/shared/forms/form-runtime-fields';

describe('syncFormComponentTypesFromConnector', () => {
  const apiBase = 'http://localhost:3005';
  const connector: DataConnector = {
    id: 1,
    appName: 'task-list',
    entityName: 'Task',
    discoveryUrl: 'http://localhost:3000/hub/discovery',
    discoveryType: 'REST',
    entityModel: {
      id: 'number',
      name: 'Task',
      description: 'Task',
      status: 'active',
      properties: [
        { name: 'status', type: 'string', label: 'Status' },
        { name: 'priority', type: 'string', label: 'Priority' },
        { name: 'assigneeId', type: 'string', label: 'Assignee' },
        { name: 'tags', type: 'array', label: 'Tags' },
      ],
    },
    endpoints: {
      baseUrl: apiBase,
      crud: {
        getAll: { url: '/api/connector/tasks', type: 'GET', data: {} },
        get: { url: '/api/connector/tasks/:id', type: 'GET', data: {} },
        create: { url: '/api/connector/tasks', type: 'POST', data: {} },
        update: { url: '/api/connector/tasks/:id', type: 'POST', data: {} },
        delete: { url: '/api/connector/tasks/:id', type: 'DELETE', data: {} },
      },
      lookups: buildTaskEntityLookupContracts(apiBase),
    },
    capabilities: ['CRUD', 'Lookups'],
    is_active: 1,
    createdAt: '',
    updatedAt: '',
    last_verified_at: '',
  };

  test('upgrades stale InputText fields when connector has lookups', () => {
    const stale: FormComponent[] = [
      { fieldKey: 'status', label: 'Status', type: 'InputText', row: 0, col: 0, span: 1 },
      { fieldKey: 'priority', label: 'Priority', type: 'InputText', row: 0, col: 1, span: 1 },
      { fieldKey: 'assigneeId', label: 'Assignee', type: 'InputText', row: 1, col: 0, span: 1 },
      { fieldKey: 'tags', label: 'Tags', type: 'InputText', row: 1, col: 1, span: 1 },
    ];

    const synced = syncFormComponentTypesFromConnector(connector, stale);
    expect(synced.find((c) => c.fieldKey === 'status')?.type).toBe('Select');
    expect(synced.find((c) => c.fieldKey === 'priority')?.type).toBe('Select');
    expect(synced.find((c) => c.fieldKey === 'assigneeId')?.type).toBe('Select');
    expect(synced.find((c) => c.fieldKey === 'tags')?.type).toBe('MultiSelect');
    expect(synced.find((c) => c.fieldKey === 'status')?.dataFetch?.forProperty).toBe('status');
  });

  test('normalizeRuntimeFieldTypes keeps Select when dataFetch is set', () => {
    const normalized = normalizeRuntimeFieldTypes([
      {
        fieldKey: 'status',
        type: 'Select',
        label: 'Status',
        dataFetch: { forProperty: 'status' },
        definition: { type: 'InputText' },
      },
    ]);
    expect(normalized[0].type).toBe('Select');
  });
});
