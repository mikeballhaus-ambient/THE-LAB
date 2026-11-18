import { describe, expect, test } from '@jest/globals';
import {
  filterComponentsForChartBuilderSlot,
  filterContractForChartBuilderSlot,
} from '@/shared/lab-integrations/chart-builder-stub-field-filter';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

const baseContract: FormsBuilderContract = {
  appName: 'chart-builder',
  entityName: 'Chart',
  capabilities: ['CRUD'],
  entityModel: {
    id: 'string',
    name: 'Chart',
    description: 'Chart',
    status: 'active',
    properties: [
      { name: 'chartKey', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'chartType', type: 'string' },
      { name: 'dataConnectorId', type: 'number' },
    ],
  },
  endpoints: {
    baseUrl: 'http://localhost:3013',
    crud: {
      getAll: { url: '/x', type: 'GET', data: {} },
      get: { url: '/x/:id', type: 'GET', data: {} },
      create: { url: '/x', type: 'POST', data: {} },
      update: { url: '/x/:id', type: 'POST', data: {} },
      delete: { url: '/x/:id', type: 'DELETE', data: {} },
    },
    lookups: [],
  },
};

describe('filterContractForChartBuilderSlot', () => {
  test('metadata slot keeps chart fields only', () => {
    const filtered = filterContractForChartBuilderSlot(
      'app-lab-chartbuilder',
      'chart.designer.metadata',
      baseContract,
    );
    const names = filtered.entityModel?.properties?.map((p) => p.name) ?? [];
    expect(names).toContain('chartType');
    expect(names).toContain('dataConnectorId');
  });

  test('filterComponentsForChartBuilderSlot trims stale full-chart stubs', () => {
    const components = [
      { fieldKey: 'chartKey' },
      { fieldKey: 'name' },
      { fieldKey: 'dataConnectorId' },
    ];
    const metadata = filterComponentsForChartBuilderSlot(
      'app-lab-chartbuilder',
      'chart.designer.metadata',
      components,
    );
    expect(metadata.map((c) => c.fieldKey)).toEqual(['chartKey', 'name', 'dataConnectorId']);
    const connector = filterComponentsForChartBuilderSlot(
      'app-lab-chartbuilder',
      'chart.designer.connector',
      components,
    );
    expect(connector.map((c) => c.fieldKey)).toEqual([]);
  });

  test('connector slot keeps mapping fields only', () => {
    const filtered = filterContractForChartBuilderSlot(
      'app-lab-chartbuilder',
      'chart.designer.connector',
      {
        ...baseContract,
        entityModel: {
          ...baseContract.entityModel,
          properties: [
            ...(baseContract.entityModel?.properties ?? []),
            { name: 'dataMappingJson', type: 'string' },
          ],
        },
      },
    );
    const names = filtered.entityModel?.properties?.map((p) => p.name) ?? [];
    expect(names).toContain('dataMappingJson');
    expect(names).not.toContain('dataConnectorId');
    expect(names).not.toContain('chartKey');
  });

  test('connector slot unhides mapping JSON fields for stub provision', () => {
    const filtered = filterContractForChartBuilderSlot(
      'app-lab-chartbuilder',
      'chart.designer.connector',
      {
        ...baseContract,
        entityModel: {
          ...baseContract.entityModel,
          properties: [
            { name: 'dataMappingJson', type: 'string', hidden: true },
            { name: 'allowedFiltersJson', type: 'string', hidden: true },
          ],
        },
      },
    );
    const mapping = filtered.entityModel?.properties?.find((p) => p.name === 'dataMappingJson');
    expect(mapping?.hidden).toBe(false);
  });
});
