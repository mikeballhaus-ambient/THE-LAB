import { describe, expect, test } from '@jest/globals';
import { eventTypeMatches } from '@/backend/lab-rules/lab-rules-match';
import { ruleTriggerMatchesEnvelope } from '@/shared/utils/lab-rule-trigger';

describe('lab-rule-trigger', () => {
  test('matches when any trigger event type matches envelope', () => {
    const trigger = {
      eventTypes: ['app-lab-tasklist.task.created', 'platform-ledger.entry.posted'],
    };
    expect(
      ruleTriggerMatchesEnvelope(trigger, 'platform-ledger.entry.posted', eventTypeMatches),
    ).toBe(true);
    expect(ruleTriggerMatchesEnvelope(trigger, 'other.event', eventTypeMatches)).toBe(false);
  });

  test('normalizes legacy eventType field', () => {
    expect(
      ruleTriggerMatchesEnvelope(
        { eventType: 'app-lab-tasklist.task.created' },
        'app-lab-tasklist.task.created',
        eventTypeMatches,
      ),
    ).toBe(true);
  });
});
