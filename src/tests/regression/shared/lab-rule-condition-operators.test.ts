import { describe, expect, test } from '@jest/globals';
import {
  labRuleConditionIsOrdering,
  labRuleConditionNeedsValue,
  labRuleConditionOperatorOptions,
  labRuleValueKindFromJsonType,
} from '@/shared/utils/lab-rule-condition-operators';

/**
 * Operator menu is driven by the field's type.
 *
 * The original UI offered four fixed options for every field, so a `number` like `stepValue` had no
 * ordering test at all. The other failure mode is offering everything: `contains` on a boolean is a
 * menu entry that can never be useful. These tests pin both edges.
 */

function operators(valueKind: Parameters<typeof labRuleConditionOperatorOptions>[0]): string[] {
  return labRuleConditionOperatorOptions(valueKind).map((option) => option.value);
}

describe('numeric fields', () => {
  test('offer the full ordering set', () => {
    const values = operators('number');
    expect(values).toContain('payload_greater_than');
    expect(values).toContain('payload_greater_or_equal');
    expect(values).toContain('payload_less_than');
    expect(values).toContain('payload_less_or_equal');
  });

  test('do not offer contains', () => {
    expect(operators('number')).not.toContain('payload_contains');
  });

  test('still offer presence and equality', () => {
    expect(operators('number')).toEqual(
      expect.arrayContaining(['payload_exists', 'payload_missing', 'payload_equals', 'payload_not_equals']),
    );
  });
});

describe('boolean fields', () => {
  test('offer equality and presence only', () => {
    // "greater than" on true/false has no meaning; offering it would let an author save a test the
    // evaluator can only interpret by guessing.
    expect(operators('boolean')).toEqual([
      'payload_exists',
      'payload_missing',
      'payload_equals',
      'payload_not_equals',
    ]);
  });

  test('offer no ordering or text matching', () => {
    expect(labRuleConditionIsOrdering('payload_greater_than')).toBe(true);
    expect(operators('boolean')).not.toContain('payload_contains');
  });
});

describe('string fields', () => {
  test('offer contains, because names and memos need it', () => {
    expect(operators('string')).toContain('payload_contains');
    expect(operators('string')).toContain('payload_not_contains');
  });

  test('also offer ordering, because a string may hold a date', () => {
    // The catalog has no `date` kind; dates arrive as `string` and the evaluator detects them at run
    // time. Hiding ordering would make date comparisons impossible to author.
    expect(operators('string')).toContain('payload_less_than');
  });
});

describe('id fields', () => {
  test('offer identity and presence only', () => {
    expect(operators('id')).toEqual([
      'payload_exists',
      'payload_missing',
      'payload_equals',
      'payload_not_equals',
    ]);
  });
});

describe('unknown fields', () => {
  test('offer everything rather than hiding what the author needs', () => {
    const values = operators(undefined);
    expect(values).toContain('payload_greater_than');
    expect(values).toContain('payload_contains');
  });
});

describe('value requirement', () => {
  test('presence operators need no value', () => {
    expect(labRuleConditionNeedsValue('payload_exists')).toBe(false);
    expect(labRuleConditionNeedsValue('payload_missing')).toBe(false);
  });

  test('comparison operators need a value', () => {
    expect(labRuleConditionNeedsValue('payload_equals')).toBe(true);
    expect(labRuleConditionNeedsValue('payload_greater_than')).toBe(true);
    expect(labRuleConditionNeedsValue('payload_contains')).toBe(true);
  });
});

describe('captured JSON type mapping', () => {
  test('maps a webhook capture onto a field kind', () => {
    // A webhook has no declared payload shape, so the captured sample's JSON type is the only source
    // of truth for which operators to offer.
    expect(labRuleValueKindFromJsonType('number')).toBe('number');
    expect(labRuleValueKindFromJsonType('boolean')).toBe('boolean');
    expect(labRuleValueKindFromJsonType('string')).toBe('string');
  });

  test('treats an unknown capture type as text', () => {
    expect(labRuleValueKindFromJsonType(undefined)).toBe('string');
    expect(labRuleValueKindFromJsonType('object')).toBe('string');
  });
});
