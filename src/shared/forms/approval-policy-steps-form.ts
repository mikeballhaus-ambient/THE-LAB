import type { LabApprovalPolicyDefinitionV1 } from '@/shared/types/lab-approval';
import { parseLabApprovalPolicyDefinition } from '@/shared/types/schemas/lab-approval-schema';

export const LAB_APPROVAL_POLICY_MIN_STEPS = 1;
export const LAB_APPROVAL_POLICY_MAX_STEPS = 10;

export interface ApprovalPolicyStepDraft {
  assigneeUserId: number | null;
  label: string;
}

function num(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    const n = Number(raw);
    return n > 0 ? n : null;
  }
  return null;
}

export function defaultApprovalPolicyStepDraft(): ApprovalPolicyStepDraft {
  return { assigneeUserId: null, label: '' };
}

export function parseApprovalPolicyDefinitionJson(raw: unknown): ApprovalPolicyStepDraft[] | null {
  if (raw == null || String(raw).trim() === '') {
    return null;
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const definition = parseLabApprovalPolicyDefinition(parsed);
    return definition.steps.map((step) => ({
      assigneeUserId: step.assigneeUserId,
      label: step.label?.trim() ?? '',
    }));
  } catch {
    return null;
  }
}

export function hydrateApprovalPolicyStepsFromFormValues(
  getValue: (fieldKey: string) => unknown,
): ApprovalPolicyStepDraft[] {
  const fromDefinition = parseApprovalPolicyDefinitionJson(getValue('definitionJson'));
  if (fromDefinition?.length) {
    return fromDefinition;
  }

  const legacy: ApprovalPolicyStepDraft[] = [];
  const s1 = num(getValue('step1AssigneeUserId'));
  if (s1 != null) {
    legacy.push({
      assigneeUserId: s1,
      label: String(getValue('step1Label') ?? '').trim(),
    });
  }
  const s2 = num(getValue('step2AssigneeUserId'));
  if (s2 != null) {
    legacy.push({
      assigneeUserId: s2,
      label: String(getValue('step2Label') ?? '').trim(),
    });
  }
  if (legacy.length > 0) {
    return legacy;
  }

  return [defaultApprovalPolicyStepDraft()];
}

export function buildApprovalPolicyDefinitionFromDrafts(
  drafts: readonly ApprovalPolicyStepDraft[],
): LabApprovalPolicyDefinitionV1 {
  const steps = drafts
    .map((draft, index) => {
      const assigneeUserId = draft.assigneeUserId;
      if (assigneeUserId == null || assigneeUserId <= 0) {
        return null;
      }
      const label = draft.label.trim();
      return {
        assigneeUserId,
        label: label || `Step ${index + 1}`,
      };
    })
    .filter((step): step is NonNullable<typeof step> => step != null);

  if (steps.length === 0) {
    throw new Error('Add at least one step with an assignee');
  }

  return parseLabApprovalPolicyDefinition({ schemaVersion: 1, steps });
}

/** Persist in-progress drafts to the hidden `definitionJson` form field (may have zero steps until validation). */
export function serializeApprovalPolicyDefinitionJson(
  drafts: readonly ApprovalPolicyStepDraft[],
): string {
  const steps = drafts
    .filter((draft) => draft.assigneeUserId != null && draft.assigneeUserId > 0)
    .map((draft, index) => ({
      assigneeUserId: draft.assigneeUserId as number,
      label: draft.label.trim() || `Step ${index + 1}`,
    }));
  return JSON.stringify({ schemaVersion: 1, steps });
}

export function approvalPolicyStepsValidForSubmit(drafts: readonly ApprovalPolicyStepDraft[]): boolean {
  if (drafts.length < LAB_APPROVAL_POLICY_MIN_STEPS) {
    return false;
  }
  return drafts.every((draft) => draft.assigneeUserId != null && draft.assigneeUserId > 0);
}
