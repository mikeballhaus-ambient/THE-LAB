import { describe, expect, test } from '@jest/globals';
import {
  mergeIntegrationBodyFromPayload,
  resolveWorkflowBodySourcePath,
} from '@/shared/utils/lab-workflow-integration-body';

describe('resolveWorkflowBodySourcePath', () => {
  const payload = { expenseId: 'e-1', amountCents: 100 };

  test('reads flat item fields', () => {
    expect(resolveWorkflowBodySourcePath(payload, 'expenseId')).toBe('e-1');
  });

  test('accepts payload.* aliases from the mapper UI', () => {
    expect(resolveWorkflowBodySourcePath(payload, 'payload.amountCents')).toBe(100);
  });
});

describe('mergeIntegrationBodyFromPayload', () => {
  test('maps bodyFromPayload with payload.* paths onto flat item json', () => {
    const body = mergeIntegrationBodyFromPayload(
      { taskId: 't-9', title: 'Ship it' },
      { id: 'payload.taskId', name: 'title' },
      { source: 'workflow' },
    );
    expect(body).toEqual({ source: 'workflow', id: 't-9', name: 'Ship it' });
  });
});
