import { describe, expect, test } from '@jest/globals';
import { describeCodeStep } from '@/shared/utils/lab-workflow-definition-canvas';
import { summarizeConditionForCanvas } from '@/shared/utils/lab-workflow-graph-labels';

/**
 * Canvas card labels.
 *
 * Both of these were visibly wrong on a real graph:
 *
 * - a `code` card showed `(items) => {` — the first line of a block body, which says nothing;
 * - an `if` card showed `step Value is present` — camelCase split mid-identifier, reading as a typo.
 *
 * These tests pin the readable output, not the implementation.
 */

describe('describeCodeStep', () => {
  test('names the field a starter-code body writes', () => {
    const source = [
      '(items) => {',
      '  return items.map((item) => {',
      '    return { ...item, stepValue: (item.stepValue ?? 0) + 1 }',
      '  })',
      '}',
    ].join('\n');
    // The old hint was the literal text `(items) => {`.
    expect(describeCodeStep(source)).toBe('Writes stepValue');
  });

  test('ignores field-like text in comments', () => {
    const source = [
      '(items) => {',
      '  // Increment `ignoredField`, treating a missing value as 0.',
      '  return items.map((item) => ({ ...item, realField: 1 }))',
      '}',
    ].join('\n');
    const hint = describeCodeStep(source);
    expect(hint).toContain('realField');
    expect(hint).not.toContain('ignoredField');
  });

  test('truncates when a body writes many fields', () => {
    const source = '(items) => items.map((item) => ({ ...item, a: 1, b: 2, c: 3 }))';
    expect(describeCodeStep(source)).toBe('Writes a, b +1 more');
  });

  test('falls back for code that writes no named field', () => {
    expect(describeCodeStep('(items) => items.filter((item) => item.ok)')).toBe(
      'Transforms the items',
    );
  });

  test('distinguishes an empty body', () => {
    expect(describeCodeStep('')).toBe('No code yet');
    expect(describeCodeStep(undefined)).toBe('No code yet');
  });
});

describe('summarizeConditionForCanvas payload paths', () => {
  test('keeps a camelCase field intact', () => {
    // Not `step Value` — the field name is the one thing a reader needs verbatim.
    expect(summarizeConditionForCanvas({ kind: 'payload_exists', path: 'stepValue' } as never)).toBe(
      'stepValue is present',
    );
  });

  test('keeps a path with digits and no separators intact', () => {
    expect(
      summarizeConditionForCanvas({ kind: 'payload_exists', path: 'item2Count' } as never),
    ).toBe('item2Count is present');
  });

  test('turns real separators into spaces', () => {
    expect(
      summarizeConditionForCanvas({ kind: 'payload_exists', path: 'first_name' } as never),
    ).toBe('first name is present');
  });

  test('keeps parent segments so an ambiguous leaf stays clear', () => {
    expect(
      summarizeConditionForCanvas({ kind: 'payload_exists', path: 'user.first_name' } as never),
    ).toBe('user › first name is present');
  });

  test('equals still renders a readable value', () => {
    expect(
      summarizeConditionForCanvas({
        kind: 'payload_equals',
        path: 'loopExhausted',
        value: true,
      } as never),
    ).toBe('loopExhausted equals yes');
  });
});
