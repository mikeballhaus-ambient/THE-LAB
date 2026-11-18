import { describe, expect, test } from '@jest/globals';
import {
  listWorkflowTriggerTestScenarios,
  summarizeWorkflowTriggerPayload,
} from '@/shared/utils/lab-workflow-trigger-test-scenarios';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

const taskCreated: LabDomainEventCatalogEntry = {
  eventType: 'app-lab-tasklist.task.created',
  sourceAppId: 'app-lab-tasklist',
  label: 'Task created',
  description: '',
  publisherKind: 'catalog-app',
  payloadFields: [
    { path: 'title', label: 'Title', valueKind: 'string' },
    { path: 'assigneeId', label: 'Assignee', valueKind: 'userId' },
  ],
};

describe('listWorkflowTriggerTestScenarios', () => {
  test('returns two curated samples for task.created', () => {
    const list = listWorkflowTriggerTestScenarios('app-lab-tasklist.task.created', [taskCreated]);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('task-no-assignee');
  });

  test('returns expense approved curated samples', () => {
    const list = listWorkflowTriggerTestScenarios('app-expense-reports.expense.approved', [taskCreated]);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('expense-travel-approved');
    expect(list[0].buildEnvelope().payload.category).toBe('Travel');
  });

  test('falls back to a generic typical example for other catalog events', () => {
    const charter: LabDomainEventCatalogEntry = {
      eventType: 'app-project-charter.charter.approved',
      sourceAppId: 'app-project-charter',
      label: 'Charter approved',
      description: '',
      publisherKind: 'catalog-app',
      payloadFields: [{ path: 'charterId', label: 'Charter ID', valueKind: 'id' }],
    };
    const list = listWorkflowTriggerTestScenarios(charter.eventType, [charter]);
    expect(list).toHaveLength(1);
    expect(list[0].name).toContain('Charter approved');
  });
});

describe('summarizeWorkflowTriggerPayload', () => {
  test('formats assignee with cast name when known', () => {
    const scenario = listWorkflowTriggerTestScenarios('app-lab-tasklist.task.created', [taskCreated])[1];
    const envelope = scenario.buildEnvelope();
    const lines = summarizeWorkflowTriggerPayload(envelope, [taskCreated]);
    expect(lines.some((line) => line.includes('Mia Chen'))).toBe(true);
  });
});
