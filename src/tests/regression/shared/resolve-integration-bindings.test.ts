import { describe, expect, test } from '@jest/globals';
import { TASK_LIST_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import { CHART_BUILDER_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import {
  bindingsForRegion,
  inferPlacementRegionId,
  resolveBindingPresentation,
  validateBindingPlacement,
} from '@/shared/integration/resolve-integration-bindings';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

const sampleBinding = (overrides: Partial<LabIntegrationBindingRecord>): LabIntegrationBindingRecord => ({
  id: 'b1',
  hostAppId: 'app-lab-tasklist',
  slot: 'task.create.dialog',
  kind: 'form.surface',
  providerAppId: 'app-lab-formsbuilder',
  providerRef: 'task-list.task-list.tasks.task-create-dialog',
  config: { schemaVersion: 1, serviceId: 'task-list.tasks' },
  enabled: true,
  createdByUserId: 1,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('resolve-integration-bindings', () => {
  test('inferPlacementRegionId maps dialog slots to dialogs region', () => {
    const binding = sampleBinding({ config: { schemaVersion: 1 } });
    expect(inferPlacementRegionId(TASK_LIST_INTEGRATION_MANIFEST, binding)).toBe('dialogs');
  });

  test('bindingsForRegion returns enabled bindings sorted by order', () => {
    const a = sampleBinding({
      id: 'a',
      config: {
        schemaVersion: 1,
        placement: { regionId: 'reports.grid', order: 20 },
      },
      kind: 'chart.surface',
      slot: 'reports.by-status',
    });
    const b = sampleBinding({
      id: 'b',
      config: {
        schemaVersion: 1,
        placement: { regionId: 'reports.grid', order: 5 },
      },
      kind: 'chart.surface',
      slot: 'reports.by-priority',
    });
    const rows = bindingsForRegion(
      [a, b],
      TASK_LIST_INTEGRATION_MANIFEST,
      'task-list.workspace',
      'reports.grid',
    );
    expect(rows.map((row) => row.id)).toEqual(['b', 'a']);
  });

  test('resolveBindingPresentation prefers binding placement over slot default', () => {
    const binding = sampleBinding({
      slot: 'chart.designer.metadata',
      config: {
        schemaVersion: 1,
        placement: { regionId: 'designer.forms', presentation: 'dialog' },
      },
    });
    const region = CHART_BUILDER_INTEGRATION_MANIFEST.integrationSurfaces![0].regions[0];
    expect(resolveBindingPresentation(binding, region, CHART_BUILDER_INTEGRATION_MANIFEST)).toBe(
      'dialog',
    );
  });

  test('inferPlacementRegionId uses manifest slot regionId', () => {
    const binding = sampleBinding({
      hostAppId: 'app-lab-chartbuilder',
      slot: 'chart.designer.metadata',
      config: { schemaVersion: 1 },
    });
    expect(inferPlacementRegionId(CHART_BUILDER_INTEGRATION_MANIFEST, binding)).toBe(
      'designer.forms',
    );
  });

  test('validateBindingPlacement rejects unknown region', () => {
    const result = validateBindingPlacement(TASK_LIST_INTEGRATION_MANIFEST, 'form.surface', {
      regionId: 'missing',
    });
    expect(result.ok).toBe(false);
  });
});
