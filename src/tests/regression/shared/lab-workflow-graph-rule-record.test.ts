import { describe, expect, test } from '@jest/globals';
import {
  labWorkflowRuleNodeIsConfigured,
  resolveWorkflowGraphRuleAsRecord,
} from '@/shared/utils/lab-workflow-graph-rule-record';

describe('lab-workflow-graph-rule-record', () => {
  test('configured when inline name and conditions', () => {
    expect(
      labWorkflowRuleNodeIsConfigured({
        id: '00000000-0000-4000-8000-000000000001',
        kind: 'rule',
        position: { x: 0, y: 0 },
        name: 'Test',
        conditions: [{ kind: 'payload_exists', path: 'id' }],
      }),
    ).toBe(true);
  });

  test('resolveWorkflowGraphRuleAsRecord uses workflow trigger', () => {
    const record = resolveWorkflowGraphRuleAsRecord(
      {
        id: '00000000-0000-4000-8000-000000000002',
        kind: 'rule',
        position: { x: 0, y: 0 },
        name: 'Inline',
        conditions: [{ kind: 'payload_equals', path: 'x', value: '1' }],
      },
      'app-lab-tasklist.task.created',
      'global',
      null,
    );
    expect(record?.definition.trigger.eventTypes).toEqual(['app-lab-tasklist.task.created']);
    expect(record?.scope).toBe('global');
  });
});
