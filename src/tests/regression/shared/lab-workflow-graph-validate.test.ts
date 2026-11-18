import { validateLabWorkflowGraphForSave } from '@/shared/utils/lab-workflow-graph-validate';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

function minimalGraph(overrides?: Partial<LabWorkflowDefinitionV2>): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: 2,
    nodes: [
      {
        id: 't1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: 'app-lab-tasklist.task.created',
      },
      {
        id: 'a1',
        kind: 'action',
        position: { x: 0, y: 80 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      },
    ],
    edges: [],
    ...overrides,
  };
}

describe('validateLabWorkflowGraphForSave', () => {
  test('allows unwired empty rule node', () => {
    const def = minimalGraph({
      nodes: [
        ...minimalGraph().nodes,
        { id: 'r1', kind: 'rule', position: { x: 0, y: 40 }, ruleId: '' },
      ],
    });
    expect(validateLabWorkflowGraphForSave(def)).toBeNull();
  });

  test('blocks wired empty rule node', () => {
    const def = minimalGraph({
      nodes: [
        { id: 't1', kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'app-lab-tasklist.task.created' },
        { id: 'r1', kind: 'rule', position: { x: 0, y: 40 }, ruleId: '' },
        { id: 'a1', kind: 'action', position: { x: 0, y: 80 }, step: { kind: 'notify_users', userIds: [], path: 'assigneeId' } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'r1', when: 'always' },
        { id: 'e2', source: 'r1', target: 'a1', when: 'on_match' },
      ],
    });
    expect(validateLabWorkflowGraphForSave(def)).toMatch(/name and at least one condition/i);
  });
});
