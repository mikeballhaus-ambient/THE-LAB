import {
  buildApprovalPolicyDefinitionFromDrafts,
  hydrateApprovalPolicyStepsFromFormValues,
} from '@/shared/forms/approval-policy-steps-form';
import type { LabApprovalPolicyDefinitionV1 } from '@/shared/types/lab-approval';
import { parseLabApprovalPolicyDefinition } from '@/shared/types/schemas/lab-approval-schema';

export function parsePolicyDefinitionFromConnectorBody(
  body: Record<string, unknown>,
  parseJsonField: (raw: unknown, label: string) => unknown,
): LabApprovalPolicyDefinitionV1 {
  if (body.definitionJson != null && String(body.definitionJson).trim()) {
    return parseLabApprovalPolicyDefinition(parseJsonField(body.definitionJson, 'definition'));
  }
  try {
    return buildApprovalPolicyDefinitionFromDrafts(
      hydrateApprovalPolicyStepsFromFormValues((key) => body[key]),
    );
  } catch {
    /* fall through to legacy step1/step2 */
  }
  const steps: LabApprovalPolicyDefinitionV1['steps'] = [];
  const s1 = body.step1AssigneeUserId;
  if (s1 !== undefined && s1 !== null && String(s1).trim() !== '') {
    steps.push({
      label: typeof body.step1Label === 'string' && body.step1Label.trim() ? body.step1Label.trim() : 'Step 1',
      assigneeUserId: Number(s1),
    });
  }
  const s2 = body.step2AssigneeUserId;
  if (s2 !== undefined && s2 !== null && String(s2).trim() !== '') {
    steps.push({
      label: typeof body.step2Label === 'string' && body.step2Label.trim() ? body.step2Label.trim() : 'Step 2',
      assigneeUserId: Number(s2),
    });
  }
  if (steps.length === 0) {
    throw new Error('Add at least one step assignee (step1AssigneeUserId)');
  }
  return { schemaVersion: 1, steps };
}
