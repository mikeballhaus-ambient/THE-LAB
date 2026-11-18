import { describe, expect, test } from '@jest/globals';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import {
  labWorkflowGraphNodeCardHeadline,
  labWorkflowGraphNodeKindDisplay,
  labWorkflowGraphNodeLabel,
} from '@/shared/utils/lab-workflow-graph-labels';

const catalog: LabIntegrationServiceCatalogResponse = {
  schemaVersion: 1,
  apps: [
    {
      appId: 'app-lab-app-builder',
      appName: 'App Builder',
      services: [
        {
          serviceId: 'lab-app-builder.catalog-tags',
          label: 'Catalog tags',
          tier: 'platform',
          entityName: 'CatalogAppTag',
          capabilities: ['CRUD'],
          connector: { segment: 'catalog-app-tags' },
          properties: [{ name: 'id', type: 'string', label: 'Tag id' }],
          primaryKeyType: 'string',
        },
      ],
    },
  ],
};

describe('labWorkflowGraphNodeLabel', () => {
  test('names lookup condition nodes from integration service', () => {
    const label = labWorkflowGraphNodeLabel(
      {
        id: 'n1',
        kind: 'condition',
        position: { x: 0, y: 0 },
        conditions: [
          {
            kind: 'lookup_field_exists',
            providerAppId: 'app-lab-app-builder',
            serviceId: 'lab-app-builder.catalog-tags',
            recordIdPath: 'id',
            field: 'id',
          },
        ],
      },
      { integrationServiceCatalog: catalog },
    );
    expect(label).toBe('Catalog tags · id exists');
  });

  test('action nodes show step type on the kind row and detail on the label', () => {
    const node = {
      id: 'n-if',
      kind: 'action' as const,
      position: { x: 0, y: 0 },
      step: {
        kind: 'if_condition' as const,
        conditions: [{ kind: 'payload_exists' as const, path: 'assigneeId' }],
      },
    };
    expect(labWorkflowGraphNodeKindDisplay(node)).toBe('IF');
    expect(labWorkflowGraphNodeLabel(node)).toMatch(/assignee/i);
    expect(labWorkflowGraphNodeCardHeadline(node)).toBe('Condition');
  });

  test('kind display uses lookup for connector conditions', () => {
    expect(
      labWorkflowGraphNodeKindDisplay({
        id: 'n1',
        kind: 'condition',
        position: { x: 0, y: 0 },
        conditions: [
          {
            kind: 'lookup_field_exists',
            providerAppId: 'app-lab-app-builder',
            serviceId: 'lab-app-builder.catalog-tags',
            recordIdPath: 'id',
            field: 'id',
          },
        ],
      }),
    ).toBe('lookup');
  });
});
