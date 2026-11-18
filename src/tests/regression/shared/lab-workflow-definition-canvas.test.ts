import { describe, expect, test } from '@jest/globals';
import {
  canvasToDefinition,
  definitionToCanvasFlow,
  flowBlockPendingNewRule,
  flowBlocksForDefinition,
  triggerBlockFromEventType,
} from '@/shared/utils/lab-workflow-definition-canvas';

describe('lab-workflow-definition-canvas', () => {
  test('round-trips trigger and steps', () => {
    const trigger = triggerBlockFromEventType('app-lab-tasklist.task.created', []);
    const flow = definitionToCanvasFlow(
      {
        schemaVersion: 1,
        trigger: { eventType: 'app-lab-tasklist.task.created' },
        steps: [
          { kind: 'rule_ref', ruleId: '00000000-0000-4000-8000-000000000001' },
          { kind: 'notify_users', userIds: [], path: 'assigneeId' },
        ],
      },
      [],
    );
    const def = canvasToDefinition(trigger, flow, 'fallback');
    expect(def.trigger.eventType).toBe('app-lab-tasklist.task.created');
    expect(def.steps).toHaveLength(2);
    expect(def.steps[1]?.kind).toBe('notify_users');
  });

  test('pending new-rule placeholders are omitted from saved definition', () => {
    const trigger = triggerBlockFromEventType('app-lab-tasklist.task.created', []);
    const pending = flowBlockPendingNewRule(0);
    const committed = definitionToCanvasFlow(
      {
        schemaVersion: 1,
        trigger: { eventType: 'app-lab-tasklist.task.created' },
        steps: [{ kind: 'notify_users', userIds: [], path: 'assigneeId' }],
      },
      [],
    );
    const def = canvasToDefinition(trigger, [pending, ...committed], 'fallback');
    expect(flowBlocksForDefinition([pending, ...committed])).toHaveLength(1);
    expect(def.steps).toHaveLength(1);
  });
});
