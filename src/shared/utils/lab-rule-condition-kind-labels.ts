import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import {
  labRuleConditionOperatorOptions,
  isPayloadOperatorKind,
} from '@/shared/utils/lab-rule-condition-operators';

type LabRuleConditionKind = LabRuleConditionV1['kind'];

/**
 * Plain-language labels for workflow and rules condition kinds (non-developer UI).
 *
 * ## Why this is derived rather than a hand-written list
 *
 * This used to be four literals that had to be kept in sync with the condition union by hand — which
 * is exactly how the editor ended up offering "Field equals" and nothing else for a number. It now
 * reads the payload operators from [`lab-rule-condition-operators.ts`](./lab-rule-condition-operators.ts)
 * and appends the connector-lookup kinds, so adding an operator in one place updates the menu
 * everywhere.
 *
 * Prefer {@link labRuleConditionOperatorOptions} directly when the field type is known: it filters to
 * the operators that make sense for that type. This flat list is for callers that have no field yet.
 */
export const LAB_RULE_CONDITION_KIND_OPTIONS: {
  label: string;
  value: LabRuleConditionKind;
}[] = [
  ...labRuleConditionOperatorOptions(undefined).map((option) => ({
    label: option.label,
    value: option.value,
  })),
  { label: 'Record field is present', value: 'lookup_field_exists' },
  { label: 'Record field equals', value: 'lookup_field_equals' },
];

/** Only the payload operators, for a menu that sits next to a chosen field. */
export const LAB_RULE_PAYLOAD_CONDITION_KIND_OPTIONS = LAB_RULE_CONDITION_KIND_OPTIONS.filter(
  (option) => isPayloadOperatorKind(option.value),
);
