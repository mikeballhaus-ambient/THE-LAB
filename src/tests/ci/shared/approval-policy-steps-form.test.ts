import { describe, expect, test } from '@jest/globals';
import {
  buildApprovalPolicyDefinitionFromDrafts,
  hydrateApprovalPolicyStepsFromFormValues,
  parseApprovalPolicyDefinitionJson,
  serializeApprovalPolicyDefinitionJson,
} from '@/shared/forms/approval-policy-steps-form';
import { parsePolicyDefinitionFromConnectorBody } from '@/shared/lab-integrations/platform-approvals-policy-connector';

describe('approval-policy-steps-form', () => {
  test('round-trips multi-step definitionJson', () => {
    const json = serializeApprovalPolicyDefinitionJson([
      { assigneeUserId: 1, label: 'Owner' },
      { assigneeUserId: 2, label: 'Finance' },
    ]);
    const parsed = parseApprovalPolicyDefinitionJson(json);
    expect(parsed).toEqual([
      { assigneeUserId: 1, label: 'Owner' },
      { assigneeUserId: 2, label: 'Finance' },
    ]);
  });

  test('connector prefers definitionJson with more than two steps', () => {
    const definition = {
      schemaVersion: 1,
      steps: [
        { assigneeUserId: 1, label: 'A' },
        { assigneeUserId: 2, label: 'B' },
        { assigneeUserId: 3, label: 'C' },
      ],
    };
    const body = {
      definitionJson: JSON.stringify(definition),
      step1AssigneeUserId: 99,
    };
    const result = parsePolicyDefinitionFromConnectorBody(body, (raw) =>
      typeof raw === 'string' ? JSON.parse(raw) : raw,
    );
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]?.assigneeUserId).toBe(1);
  });

  test('hydrates legacy step1/step2 when definitionJson missing', () => {
    const steps = hydrateApprovalPolicyStepsFromFormValues((key) => {
      if (key === 'step1AssigneeUserId') {
        return 5;
      }
      if (key === 'step1Label') {
        return 'First';
      }
      return undefined;
    });
    expect(steps).toEqual([{ assigneeUserId: 5, label: 'First' }]);
  });

  test('buildApprovalPolicyDefinitionFromDrafts defaults blank labels', () => {
    const def = buildApprovalPolicyDefinitionFromDrafts([
      { assigneeUserId: 10, label: '' },
    ]);
    expect(def.steps[0]?.label).toBe('Step 1');
  });
});
