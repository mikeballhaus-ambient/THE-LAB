import { describe, expect, test } from '@jest/globals';
import {
  CHART_BUILDER_INTEGRATION_MANIFEST,
  HELP_DESK_INTEGRATION_MANIFEST,
  TASK_LIST_INTEGRATION_MANIFEST,
} from '@/backend/db/Apps/integration-manifest-seeds';
import { resolveFormBindingRuntime } from '@/shared/integration/resolve-form-binding-runtime';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

function binding(slot: string, ref: string): LabIntegrationBindingRecord {
  return {
    id: '1',
    hostAppId: 'app-lab-tasklist',
    slot,
    kind: 'form.surface',
    providerAppId: 'app-lab-formsbuilder',
    providerRef: ref,
    enabled: true,
    config: { schemaVersion: 1, serviceId: slot.startsWith('task-list') ? 'task-list.task-lists' : 'task-list.tasks' },
    createdByUserId: 1,
    createdAt: '',
    updatedAt: '',
  };
}

describe('resolveFormBindingRuntime delete slots', () => {
  const manifest = TASK_LIST_INTEGRATION_MANIFEST;

  test('task.delete.dialog uses taskId', () => {
    const runtime = resolveFormBindingRuntime(
      manifest,
      binding('task.delete.dialog', 'form-delete-task'),
      { taskId: 9, taskListId: 2 },
    );
    expect(runtime?.recordId).toBe(9);
    expect(runtime?.connectorEntitySegment).toBe('tasks');
  });

  test('task.create.dialog ignores taskId in context (always create)', () => {
    const runtime = resolveFormBindingRuntime(
      manifest,
      binding('task.create.dialog', 'form-create-task'),
      { taskId: 9, taskListId: 2 },
    );
    expect(runtime?.recordId).toBeNull();
    expect(runtime?.presetValues.taskListId).toBe(2);
  });

  test('chart.connector.edit.dialog uses connectorId as record id', () => {
    const runtime = resolveFormBindingRuntime(
      CHART_BUILDER_INTEGRATION_MANIFEST,
      {
        ...binding('chart.connector.edit.dialog', 'form-connector-edit'),
        hostAppId: 'app-lab-chartbuilder',
        config: { schemaVersion: 1, serviceId: 'chart-builder.data-connectors' },
      },
      { connectorId: 42 },
    );
    expect(runtime?.recordId).toBe(42);
    expect(runtime?.connectorEntitySegment).toBe('data-connectors');
  });

  test('chart.designer.metadata uses chartKey as record id when loadChartRecord is true', () => {
    const runtime = resolveFormBindingRuntime(
      CHART_BUILDER_INTEGRATION_MANIFEST,
      {
        ...binding('chart.designer.metadata', 'form-chart-meta'),
        hostAppId: 'app-lab-chartbuilder',
        config: { schemaVersion: 1, serviceId: 'chart-builder.charts' },
      },
      { chartKey: 'chart_seed_status', loadChartRecord: true },
    );
    expect(runtime?.recordId).toBe('chart_seed_status');
    expect(runtime?.presetValues.chartKey).toBe('chart_seed_status');
    expect(runtime?.connectorEntitySegment).toBe('charts');
  });

  test('chart.designer.metadata does not load record on create (preset only)', () => {
    const runtime = resolveFormBindingRuntime(
      CHART_BUILDER_INTEGRATION_MANIFEST,
      {
        ...binding('chart.designer.metadata', 'form-chart-meta'),
        hostAppId: 'app-lab-chartbuilder',
        config: { schemaVersion: 1, serviceId: 'chart-builder.charts' },
      },
      { chartKey: 'chart_new_draft_key' },
    );
    expect(runtime?.recordId).toBeNull();
    expect(runtime?.presetValues.chartKey).toBe('chart_new_draft_key');
  });

  test('kanban.board.edit.dialog uses boardId', () => {
    const runtime = resolveFormBindingRuntime(
      HELP_DESK_INTEGRATION_MANIFEST,
      {
        ...binding('kanban.board.edit.dialog', 'form-edit-board'),
        hostAppId: 'app-lab-helpdesk',
        config: { schemaVersion: 1, serviceId: 'help-desk.kanban-boards' },
      },
      { boardId: 3 },
    );
    expect(runtime?.recordId).toBe(3);
    expect(runtime?.connectorEntitySegment).toBe('kanban-boards');
  });

  test('ticket.edit.dialog uses ticketId', () => {
    const runtime = resolveFormBindingRuntime(
      HELP_DESK_INTEGRATION_MANIFEST,
      {
        ...binding('ticket.edit.dialog', 'form-edit-ticket'),
        hostAppId: 'app-lab-helpdesk',
        config: { schemaVersion: 1, serviceId: 'help-desk.tickets' },
      },
      { ticketId: 12 },
    );
    expect(runtime?.recordId).toBe(12);
    expect(runtime?.connectorEntitySegment).toBe('tickets');
  });

  test('task-list.delete.dialog uses taskListId not taskId', () => {
    const runtime = resolveFormBindingRuntime(
      manifest,
      binding('task-list.delete.dialog', 'form-delete-list'),
      { taskId: 9, taskListId: 21 },
    );
    expect(runtime?.recordId).toBe(21);
    expect(runtime?.connectorEntitySegment).toBe('task-lists');
  });
});
