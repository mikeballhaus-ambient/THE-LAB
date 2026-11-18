import { describe, expect, test } from '@jest/globals';
import {
  applyCodeStep,
  LabWorkflowCodeError,
  LAB_WORKFLOW_CODE_MAX_ITEMS,
} from '@/backend/lab-workflows/lab-workflow-code-node';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';

/**
 * The `code` step.
 *
 * These tests are about the **contract**, not the JavaScript engine: that a script gets the items,
 * must give items back, cannot reach the process, and cannot hang the backend. Those four properties
 * are what make an escape hatch safe to ship to business users.
 */

function item(json: Record<string, unknown>): LabWorkflowItem {
  return { json, pairedItem: { nodeId: 'seed', itemIndex: 0 } };
}

describe('code step schema', () => {
  test('accepts a function expression', () => {
    expect(
      LabWorkflowStepSchema.safeParse({ kind: 'code', source: '(items) => items' }).success,
    ).toBe(true);
  });

  test('rejects an empty body', () => {
    expect(LabWorkflowStepSchema.safeParse({ kind: 'code', source: '' }).success).toBe(false);
  });

  test('caps the timeout', () => {
    expect(
      LabWorkflowStepSchema.safeParse({ kind: 'code', source: '(i) => i', timeoutMs: 60_000 }).success,
    ).toBe(false);
  });
});

describe('code step runtime', () => {
  test('receives the items flattened and returns rewritten items', () => {
    // The script sees the item's JSON, not the { json, pairedItem } envelope.
    const result = applyCodeStep(
      [item({ stepValue: 1 })],
      '(items) => items.map((i) => ({ ...i, stepValue: (i.stepValue ?? 0) + 1 }))',
      'code-1',
    );
    expect(result.items[0].json.stepValue).toBe(2);
    expect(result.items[0].pairedItem).toEqual({ nodeId: 'code-1', itemIndex: 0 });
    expect(result.detail.stepKind).toBe('code');
  });

  test('accepts a re-built { json } envelope as well as a bare object', () => {
    const bare = applyCodeStep([item({ a: 1 })], '(items) => items', 'code-2a');
    expect(bare.items[0].json).toEqual({ a: 1 });
    const wrapped = applyCodeStep(
      [item({ a: 1 })],
      '(items) => items.map((i) => ({ json: { b: 2 } }))',
      'code-2b',
    );
    expect(wrapped.items[0].json).toEqual({ b: 2 });
  });

  test('sees a copy, so it cannot mutate the input array', () => {
    const input = [item({ a: 1 })];
    applyCodeStep(input, '(items) => { items[0].a = 99; return items; }', 'code-3');
    expect(input[0].json.a).toBe(1);
  });

  test('has no access to process, require, or fetch', () => {
    // `import` is omitted: it is a syntax error in expression position, not an undefined global, so
    // probing it would test the parser rather than the sandbox.
    for (const probe of ['process', 'require', 'fetch', 'globalThis']) {
      const result = applyCodeStep([item({})], `() => [{ v: typeof ${probe} }]`, 'code-4');
      expect(result.items[0].json.v).toBe(probe === 'globalThis' ? 'object' : 'undefined');
    }
  });

  test('stops an infinite loop instead of hanging the backend', () => {
    expect(() =>
      applyCodeStep([item({})], '() => { while (true) {} }', 'code-5', 100),
    ).toThrow(LabWorkflowCodeError);
  });

  test('rejects a non-array result with a named reason', () => {
    expect(() => applyCodeStep([item({})], '() => 42', 'code-6')).toThrow(
      /must return an array/,
    );
  });

  test('rejects non-object items', () => {
    expect(() => applyCodeStep([item({})], "() => ['nope']", 'code-7')).toThrow(
      /must be an object/,
    );
  });

  test('rejects more items than the cap allows', () => {
    const over = LAB_WORKFLOW_CODE_MAX_ITEMS + 1;
    expect(() =>
      applyCodeStep([item({})], `() => Array.from({ length: ${over} }, () => ({}))`, 'code-8'),
    ).toThrow(/over the/);
  });

  test('reports a thrown error from the script', () => {
    expect(() => applyCodeStep([item({})], '() => { throw new Error("boom"); }', 'code-9')).toThrow(
      /boom/,
    );
  });

  test('a syntax error is reported without escaping as a crash', () => {
    expect(() => applyCodeStep([item({})], '((((', 'code-10')).toThrow(LabWorkflowCodeError);
  });
});
