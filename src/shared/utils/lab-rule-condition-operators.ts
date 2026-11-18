import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabDomainEventPayloadFieldKind } from '@/shared/types/lab-domain-event-catalog';

/**
 * Which payload comparison operators to offer, based on the field's declared type.
 *
 * ## Why the list is filtered by type
 *
 * The condition editor previously offered four fixed options regardless of the field, so a `number`
 * field like `stepValue` only had "equals" — there was no way to express `stepValue > 3`, which is
 * the obvious thing to want from a counter. Showing every operator on every field is the other
 * failure mode: `Field contains` on a boolean is a menu entry that can never do anything useful.
 *
 * The type comes from the event catalog (`valueKind`) or, for a webhook with a captured payload, from
 * the JSON type of the captured sample. When the type is genuinely unknown the full set is offered,
 * because hiding an operator the author needs is worse than showing one they will not pick.
 *
 * ## Dates
 *
 * There is no `date` valueKind — the catalog calls them `string`. Date ordering is therefore offered
 * on strings too, and the evaluator decides at run time whether the two operands parse as dates
 * (see `compareOrdered`). This is why the string list is a superset rather than a strict set.
 */

export type LabRulePayloadConditionKind = LabRuleConditionV1['kind'];

export interface LabRuleConditionOperatorOption {
  label: string;
  value: LabRulePayloadConditionKind;
  /** True when the operator needs a comparison value; `exists`/`missing` do not. */
  needsValue: boolean;
  /** Editor control for the value: ordering dates want a date picker, numbers a number box. */
  valueInput: 'text' | 'number' | 'boolean' | 'date' | 'user' | 'none';
}

/** The payload members of the union, so a narrowed condition exposes `path` and `value`. */
export type LabRulePayloadCondition = Extract<LabRuleConditionV1, { path: string }>;

/**
 * True for condition kinds that test a **payload path** (as opposed to a connector lookup).
 *
 * A type guard rather than a `kind.startsWith('payload_')` check, so adding a new payload operator
 * fails to compile here until it is classified — the whole point being that no switch can silently
 * fall through and render "Condition" on a canvas card.
 */
export function isPayloadOperatorKind(
  kind: LabRuleConditionV1['kind'],
): kind is LabRulePayloadCondition['kind'] {
  switch (kind) {
    case 'payload_equals':
    case 'payload_not_equals':
    case 'payload_greater_than':
    case 'payload_greater_or_equal':
    case 'payload_less_than':
    case 'payload_less_or_equal':
    case 'payload_contains':
    case 'payload_not_contains':
    case 'payload_exists':
    case 'payload_missing':
      return true;
    case 'lookup_field_equals':
    case 'lookup_field_exists':
      return false;
    default:
      return false;
  }
}

/**
 * Object-level guard for template use.
 *
 * Vue template type-checking narrows an object only from a guard that takes **that object**, not from
 * one that takes `condition.kind`. Without this, every `condition.path` inside a `v-if` on the kind
 * still errors — the guard narrows a string, and the string is a value copy.
 */
export function isPayloadCondition(
  condition: LabRuleConditionV1,
): condition is LabRulePayloadCondition {
  return isPayloadOperatorKind(condition.kind);
}

const PRESENT: LabRuleConditionOperatorOption = {
  label: 'Field is present',
  value: 'payload_exists',
  needsValue: false,
  valueInput: 'none',
};

const MISSING: LabRuleConditionOperatorOption = {
  label: 'Field is missing',
  value: 'payload_missing',
  needsValue: false,
  valueInput: 'none',
};

const EQUALS: LabRuleConditionOperatorOption = {
  label: 'Field equals',
  value: 'payload_equals',
  needsValue: true,
  valueInput: 'text',
};

const NOT_EQUALS: LabRuleConditionOperatorOption = {
  label: 'Field does not equal',
  value: 'payload_not_equals',
  needsValue: true,
  valueInput: 'text',
};

const CONTAINS: LabRuleConditionOperatorOption = {
  label: 'Field contains',
  value: 'payload_contains',
  needsValue: true,
  valueInput: 'text',
};

const NOT_CONTAINS: LabRuleConditionOperatorOption = {
  label: 'Field does not contain',
  value: 'payload_not_contains',
  needsValue: true,
  valueInput: 'text',
};

const ORDERING: LabRuleConditionOperatorOption[] = [
  { label: 'Is greater than', value: 'payload_greater_than', needsValue: true, valueInput: 'text' },
  {
    label: 'Is greater than or equal to',
    value: 'payload_greater_or_equal',
    needsValue: true,
    valueInput: 'text',
  },
  { label: 'Is less than', value: 'payload_less_than', needsValue: true, valueInput: 'text' },
  {
    label: 'Is less than or equal to',
    value: 'payload_less_or_equal',
    needsValue: true,
    valueInput: 'text',
  },
];

function withValueInput(
  options: LabRuleConditionOperatorOption[],
  valueInput: LabRuleConditionOperatorOption['valueInput'],
): LabRuleConditionOperatorOption[] {
  return options.map((option) =>
    option.needsValue ? { ...option, valueInput } : option,
  );
}

/**
 * Operators that make sense for one field type, in menu order.
 *
 * Ordering is grouped: presence first (cheapest to reason about), then equality, then ordering, then
 * text matching. The author is usually looking for one of the first two.
 */
export function labRuleConditionOperatorOptions(
  valueKind: LabDomainEventPayloadFieldKind | 'date' | undefined,
): LabRuleConditionOperatorOption[] {
  // `id` is compared for identity or presence only — "greater than" on an opaque uuid is meaningless.
  if (valueKind === 'id') {
    return [PRESENT, MISSING, EQUALS, NOT_EQUALS];
  }
  if (valueKind === 'userId') {
    return withValueInput([PRESENT, MISSING, EQUALS, NOT_EQUALS], 'user');
  }
  if (valueKind === 'boolean') {
    return withValueInput([PRESENT, MISSING, EQUALS, NOT_EQUALS], 'boolean');
  }
  if (valueKind === 'number') {
    return withValueInput([PRESENT, MISSING, EQUALS, NOT_EQUALS, ...ORDERING], 'number');
  }
  if (valueKind === 'date') {
    return withValueInput([PRESENT, MISSING, EQUALS, NOT_EQUALS, ...ORDERING], 'date');
  }
  if (valueKind === 'string') {
    // Strings carry the whole set: a string field may hold a date, and `contains` is the common case
    // for names, memos and ids-as-text.
    return [PRESENT, MISSING, EQUALS, NOT_EQUALS, ...ORDERING, CONTAINS, NOT_CONTAINS];
  }
  // Unknown (a webhook field with no captured sample, or a custom path): offer everything.
  return [
    PRESENT,
    MISSING,
    EQUALS,
    NOT_EQUALS,
    ...ORDERING,
    CONTAINS,
    NOT_CONTAINS,
  ];
}

/** The option for one operator, so the editor can read its `valueInput` without filtering a list. */
export function labRuleConditionOperatorOption(
  kind: LabRulePayloadConditionKind,
): LabRuleConditionOperatorOption | undefined {
  return labRuleConditionOperatorOptions(undefined).find((option) => option.value === kind)
    ?? labRuleConditionOperatorOptions('number').find((option) => option.value === kind);
}

export function labRuleConditionNeedsValue(kind: LabRulePayloadConditionKind): boolean {
  return labRuleConditionOperatorOption(kind)?.needsValue ?? false;
}

/**
 * Build the condition that results from switching operator.
 *
 * Shared by the workflow condition editor and the Rules engine editor so the two cannot drift: the
 * same switch carries the path over, keeps the value when the new operator still uses one, and drops
 * it for `exists` / `missing` rather than persisting an ignored field.
 *
 * Ordering and `contains` are narrowed to string|number because their schema entries reject a
 * boolean — carrying `true` across from `equals` would produce a definition that fails validation on
 * save, long after the operator was chosen.
 */
export function nextLabRuleCondition(
  condition: LabRuleConditionV1,
  nextKind: LabRuleConditionV1['kind'],
  fallbackPath: string,
): LabRuleConditionV1 {
  const option = labRuleConditionOperatorOption(nextKind);
  const isPayloadCurrent = isPayloadCondition(condition);
  // A connector lookup has no payload path; start from the caller's sensible default.
  const path = isPayloadCurrent ? condition.path : fallbackPath;

  if (!option?.needsValue) {
    return { kind: nextKind, path } as LabRuleConditionV1;
  }

  const carried = isPayloadCurrent && 'value' in condition ? condition.value : '';
  const narrowed =
    labRuleConditionIsOrdering(nextKind)
    || nextKind === 'payload_contains'
    || nextKind === 'payload_not_contains';
  const value = narrowed
    ? typeof carried === 'string' || typeof carried === 'number'
      ? carried
      : ''
    : carried;
  return { kind: nextKind, path, value } as LabRuleConditionV1;
}

/** True for the four ordering operators, so callers can branch without listing them. */
export function labRuleConditionIsOrdering(kind: LabRulePayloadConditionKind): boolean {
  return (
    kind === 'payload_greater_than'
    || kind === 'payload_greater_or_equal'
    || kind === 'payload_less_than'
    || kind === 'payload_less_or_equal'
  );
}

/**
 * Map a captured-JSON type name onto a field kind.
 *
 * `number` → number, `boolean` → boolean, everything else → string. A captured `object`/`array`
 * cannot be compared at all, but the caller has already excluded those paths, so treating them as
 * string is a harmless default rather than a claim.
 */
export function labRuleValueKindFromJsonType(
  jsonType: string | undefined,
): LabDomainEventPayloadFieldKind {
  if (jsonType === 'number') {
    return 'number';
  }
  if (jsonType === 'boolean') {
    return 'boolean';
  }
  return 'string';
}
