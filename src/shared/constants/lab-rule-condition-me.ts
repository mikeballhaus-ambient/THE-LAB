/** Stored in `payload_equals.value` for dynamic user matching in rules/workflows. */
export const LAB_RULE_CONDITION_VALUE_ME = '@me';

export function isLabRuleConditionMeValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === LAB_RULE_CONDITION_VALUE_ME;
}
