import { describe, expect, test } from '@jest/globals';
import { summarizeLabRuleCondition } from '@/shared/utils/lab-rule-condition-summary';

describe('summarizeLabRuleCondition', () => {
  test('payload_exists', () => {
    expect(summarizeLabRuleCondition({ kind: 'payload_exists', path: 'assigneeId' })).toBe(
      'assigneeId is present',
    );
  });

  test('payload_equals with @me', () => {
    expect(
      summarizeLabRuleCondition({ kind: 'payload_equals', path: 'assigneeId', value: '@me' }),
    ).toBe('assigneeId equals @me');
  });
});
