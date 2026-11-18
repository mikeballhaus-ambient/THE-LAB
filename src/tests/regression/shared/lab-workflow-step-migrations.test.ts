import { describe, expect, test } from '@jest/globals';
import { parseLabWorkflowDefinition } from '@/shared/types/schemas/lab-workflow-schema';
import { migrateLabWorkflowDefinitionInput, migrateLabWorkflowStep } from '@/shared/utils/lab-workflow-step-migrations';

describe('lab-workflow-step-migrations', () => {
  test('migrates notify_payload_user to notify_users with path only', () => {
    const migrated = migrateLabWorkflowStep({
      kind: 'notify_payload_user',
      path: 'assigneeUserId',
      message: { title: 'Hi' },
    } as never);
    expect(migrated).toEqual({
      kind: 'notify_users',
      userIds: [],
      path: 'assigneeUserId',
      message: { title: 'Hi' },
    });
  });

  test('parseLabWorkflowDefinition accepts legacy v2 graphs after migration', () => {
    const def = parseLabWorkflowDefinition({
      schemaVersion: 2,
      nodes: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          kind: 'trigger',
          position: { x: 0, y: 0 },
          eventType: 'platform-approvals.request.created',
        },
        {
          id: '00000000-0000-4000-8000-000000000011',
          kind: 'action',
          position: { x: 0, y: 120 },
          step: { kind: 'notify_payload_user', path: 'assigneeUserId' },
        },
      ],
      edges: [
        {
          id: '00000000-0000-4000-8000-000000000012',
          source: '00000000-0000-4000-8000-000000000010',
          target: '00000000-0000-4000-8000-000000000011',
          when: 'always',
        },
      ],
    });
    if (def.schemaVersion !== 2) {
      throw new Error('expected v2');
    }
    const action = def.nodes.find((n) => n.kind === 'action');
    expect(action?.kind === 'action' && action.step).toEqual({
      kind: 'notify_users',
      userIds: [],
      path: 'assigneeUserId',
    });
  });

  test('migrateLabWorkflowDefinitionInput is idempotent', () => {
    const input = {
      schemaVersion: 1,
      trigger: { eventType: 'x' },
      steps: [{ kind: 'notify_payload_user', path: 'assigneeId' }],
    };
    const once = migrateLabWorkflowDefinitionInput(input);
    const twice = migrateLabWorkflowDefinitionInput(once);
    expect(twice).toEqual(once);
  });
});
