import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import { getPayloadValue } from './lab-rules-match';

/** Collect only payload fields that conditions actually evaluated. */
export function buildEvaluatedFactsForConditions(
  conditions: LabRuleConditionV1[] | undefined,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const facts: Record<string, unknown> = {};
  for (const condition of conditions ?? []) {
    if (condition.kind === 'lookup_field_exists' || condition.kind === 'lookup_field_equals') {
      facts[`${condition.serviceId}.${condition.field}`] = getPayloadValue(
        payload,
        condition.recordIdPath,
      );
      continue;
    }
    facts[condition.path] = getPayloadValue(payload, condition.path);
  }
  return facts;
}
