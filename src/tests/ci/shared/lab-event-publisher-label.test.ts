import { describe, expect, test } from '@jest/globals';
import { resolveLabEventPublisherDisplayName } from '@/shared/utils/lab-event-publisher-label';

describe('resolveLabEventPublisherDisplayName', () => {
  const names = new Map<string, string>([
    ['app-lab-tasklist', 'Task List'],
    ['app-lab-workflow-studio', 'Workflow Studio'],
  ]);

  test('uses registry app name for catalog app ids', () => {
    expect(resolveLabEventPublisherDisplayName('app-lab-tasklist', names)).toBe('Task List');
  });

  test('maps platform-rules to workflow studio app name', () => {
    expect(resolveLabEventPublisherDisplayName('platform-rules', names)).toBe('Workflow Studio');
  });

  test('humanizes unknown app ids', () => {
    expect(resolveLabEventPublisherDisplayName('app-custom-demo', new Map())).toBe('Custom Demo');
  });
});
