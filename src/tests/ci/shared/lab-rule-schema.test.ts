import { describe, expect, test } from '@jest/globals';
import { parseLabRuleCreate, parseLabRuleDefinition } from '@/shared/types/schemas/lab-rule-schema';
import { randomUUID } from 'node:crypto';

describe('lab-rule schema', () => {
  test('parseLabRuleDefinition accepts v2 definition', () => {
    const def = parseLabRuleDefinition({
      schemaVersion: 2,
      trigger: { eventTypes: ['app-lab-tasklist.task.created'] },
    });
    expect(def.schemaVersion).toBe(2);
    expect(def.trigger.eventTypes).toEqual(['app-lab-tasklist.task.created']);
  });

  test('migrates v1 definition by stripping deprecated actions', () => {
    const def = parseLabRuleDefinition({
      schemaVersion: 1,
      trigger: { eventType: 'app-lab-tasklist.task.created' },
      actions: [{ kind: 'notify_users', userIds: [1] }],
    });
    expect(def.schemaVersion).toBe(2);
    expect(def.trigger.eventTypes).toEqual(['app-lab-tasklist.task.created']);
    expect('actions' in def).toBe(false);
  });

  test('parseLabRuleCreate rejects global with owner', () => {
    expect(() =>
      parseLabRuleCreate({
        id: randomUUID(),
        name: 'x',
        scope: 'global',
        ownerUserId: 1,
        enabled: true,
        priority: 1,
        definition: {
          schemaVersion: 2,
          trigger: { eventTypes: ['a.b.c'] },
        },
      }),
    ).toThrow();
  });
});
