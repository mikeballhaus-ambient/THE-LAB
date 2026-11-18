import { isLabRuleConditionMeValue } from '@/shared/constants/lab-rule-condition-me';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabDomainEventPayloadFieldKind } from '@/shared/types/lab-domain-event-catalog';

export function labPayloadFieldKindLabel(kind: LabDomainEventPayloadFieldKind): string {
  switch (kind) {
    case 'userId':
      return 'Lab user';
    case 'string':
      return 'Text';
    case 'number':
      return 'Number';
    case 'boolean':
      return 'Yes / no';
    case 'id':
      return 'ID';
    default:
      return 'Value';
  }
}

/** Short human verb for each operator, shared by the rule summary and the canvas card. */
export function labRuleConditionOperatorLabel(kind: LabRuleConditionV1['kind']): string {
  switch (kind) {
    case 'payload_exists':
      return 'is present';
    case 'payload_missing':
      return 'is missing';
    case 'payload_equals':
      return 'equals';
    case 'payload_not_equals':
      return 'does not equal';
    case 'payload_greater_than':
      return 'is greater than';
    case 'payload_greater_or_equal':
      return 'is greater than or equal to';
    case 'payload_less_than':
      return 'is less than';
    case 'payload_less_or_equal':
      return 'is less than or equal to';
    case 'payload_contains':
      return 'contains';
    case 'payload_not_contains':
      return 'does not contain';
    case 'lookup_field_exists':
      return 'exists';
    case 'lookup_field_equals':
      return 'equals';
    default:
      return 'matches';
  }
}

function conditionValueLabel(value: string | number | boolean | null): string {
  return value != null && isLabRuleConditionMeValue(value) ? '@me' : String(value ?? '');
}

export function summarizeLabRuleCondition(condition: LabRuleConditionV1): string {
  if (condition.kind === 'payload_exists' || condition.kind === 'payload_missing') {
    return `${condition.path} ${labRuleConditionOperatorLabel(condition.kind)}`;
  }
  if (condition.kind === 'lookup_field_exists') {
    return `${condition.serviceId}.${condition.field} exists (record ${condition.recordIdPath})`;
  }
  if (condition.kind === 'lookup_field_equals') {
    return `${condition.serviceId}.${condition.field} equals ${conditionValueLabel(condition.value)} (record ${condition.recordIdPath})`;
  }
  return `${condition.path} ${labRuleConditionOperatorLabel(condition.kind)} ${conditionValueLabel(condition.value)}`;
}
