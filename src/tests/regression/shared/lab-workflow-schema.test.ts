import { describe, expect, test } from '@jest/globals';
import { parseLabWorkflowCreate, parseLabWorkflowDefinition } from '@/shared/types/schemas/lab-workflow-schema';

describe('lab-workflow schema', () => {
  test('parses minimal definition with steps', () => {
    const def = parseLabWorkflowDefinition({
      schemaVersion: 1,
      trigger: { eventType: 'app-lab-tasklist.task.created' },
      steps: [{ kind: 'notify_users', userIds: [1] }],
    });
    expect(def.schemaVersion).toBe(1);
    if (def.schemaVersion !== 1) {
      throw new Error('expected v1');
    }
    expect(def.steps).toHaveLength(1);
  });

  test('parses comms_system_dm_payload_user step', () => {
    const def = parseLabWorkflowDefinition({
      schemaVersion: 1,
      trigger: { eventType: 'app-lab-tasklist.task.created' },
      steps: [{ kind: 'comms_system_dm_payload_user', path: 'assigneeId' }],
    });
    if (def.schemaVersion !== 1) {
      throw new Error('expected v1');
    }
    expect(def.steps[0]?.kind).toBe('comms_system_dm_payload_user');
  });

  test('parses rule_ref step', () => {
    const def = parseLabWorkflowDefinition({
      schemaVersion: 1,
      trigger: { eventType: 'app-lab-tasklist.task.created' },
      steps: [
        {
          kind: 'rule_ref',
          ruleId: '00000000-0000-4000-8000-000000000001',
        },
      ],
    });
    if (def.schemaVersion !== 1) {
      throw new Error('expected v1');
    }
    expect(def.steps[0]?.kind).toBe('rule_ref');
  });

  test('parses graph v2 definition', () => {
    const triggerId = '00000000-0000-4000-8000-000000000010';
    const actionId = '00000000-0000-4000-8000-000000000011';
    const edgeId = '00000000-0000-4000-8000-000000000012';
    const def = parseLabWorkflowDefinition({
      schemaVersion: 2,
      nodes: [
        {
          id: triggerId,
          kind: 'trigger',
          position: { x: 0, y: 0 },
          eventType: 'app-lab-tasklist.task.created',
        },
        {
          id: actionId,
          kind: 'action',
          position: { x: 0, y: 120 },
          step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
        },
      ],
      edges: [{ id: edgeId, source: triggerId, target: actionId, when: 'always' }],
    });
    expect(def.schemaVersion).toBe(2);
    if (def.schemaVersion !== 2) {
      throw new Error('expected v2');
    }
    expect(def.nodes).toHaveLength(2);
  });

  test('create schema requires owner for user scope', () => {
    expect(() =>
      parseLabWorkflowCreate({
        id: '00000000-0000-4000-8000-000000000001',
        name: 'x',
        scope: 'user',
        definition: {
          schemaVersion: 1,
          trigger: { eventType: 'a.b' },
          steps: [{ kind: 'notify_users', userIds: [1] }],
        },
      }),
    ).toThrow();
  });
});
