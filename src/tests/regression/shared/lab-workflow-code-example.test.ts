import { describe, expect, test } from '@jest/globals';
import { buildCodeNodeExample } from '@/shared/utils/lab-workflow-code-example';
import { applyCodeStep } from '@/backend/lab-workflows/lab-workflow-code-node';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';

/**
 * The starter code an author gets when they open a `code` node.
 *
 * Two properties matter and both are easy to break:
 *
 * 1. **It must be valid and runnable as-is.** An example that fails on first run teaches the author
 *    that the node is broken.
 * 2. **`items` must be treated as an array.** Every node transforms an array, and a trigger seeds one
 *    item per event, so a single webhook body arrives as `[{…}]`. Example code that treats `items` as
 *    the payload object is the mistake this shape exists to prevent.
 */

function item(json: Record<string, unknown>): LabWorkflowItem {
  return { json, pairedItem: { nodeId: 'seed', itemIndex: 0 } };
}

describe('buildCodeNodeExample', () => {
  test('without a captured field it names no field and returns the item unchanged', () => {
    const source = buildCodeNodeExample();
    // Nothing invented: an unknown field name would parse, run, and do nothing.
    expect(source).not.toContain('stepValue');
    expect(source).toContain('return { ...item }');
  });

  test('is a block body, so there is an obvious place to add a line', () => {
    const source = buildCodeNodeExample();
    expect(source.split('\n').length).toBeGreaterThan(3);
    expect(source.trimEnd().endsWith('}')).toBe(true);
  });

  test('documents that items is an array', () => {
    expect(buildCodeNodeExample()).toContain('always an array');
  });

  test('with a captured field it increments that field', () => {
    const source = buildCodeNodeExample({ incrementField: 'stepValue' });
    expect(source).toContain('stepValue: (item.stepValue ?? 0) + 1');
  });

  test('a blank field name is treated as absent', () => {
    expect(buildCodeNodeExample({ incrementField: '   ' })).not.toContain('?? 0) + 1');
  });
});

describe('the generated example actually runs', () => {
  test('increments an array of items, not a bare object', () => {
    // This is the shape confusion the docs are about: `items` is `[{...}]`, never `{...}`.
    const result = applyCodeStep(
      [item({ stepValue: 1 })],
      buildCodeNodeExample({ incrementField: 'stepValue' }),
      'code-ex',
    );
    expect(result.items[0].json.stepValue).toBe(2);
  });

  test('the no-field example passes the item through untouched', () => {
    const result = applyCodeStep(
      [item({ anything: 'kept' })],
      buildCodeNodeExample(),
      'code-ex-2',
    );
    expect(result.items[0].json).toEqual({ anything: 'kept' });
  });

  test('incrementing an unset value starts from zero', () => {
    // A repeat call that omits the field must still advance rather than produce NaN.
    const result = applyCodeStep(
      [item({})],
      buildCodeNodeExample({ incrementField: 'stepValue' }),
      'code-ex-3',
    );
    expect(result.items[0].json.stepValue).toBe(1);
  });

  test('handles several items at once', () => {
    const result = applyCodeStep(
      [item({ stepValue: 1 }), item({ stepValue: 10 })],
      buildCodeNodeExample({ incrementField: 'stepValue' }),
      'code-ex-4',
    );
    expect(result.items.map((row) => row.json.stepValue)).toEqual([2, 11]);
  });
});
