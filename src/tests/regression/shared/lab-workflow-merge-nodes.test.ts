import { describe, expect, test } from '@jest/globals';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import { applyMergeItems } from '@/shared/utils/lab-workflow-item-transforms';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';
import {
  summarizeValidation,
  validateWorkflowDefinition,
} from '@/shared/utils/validate-lab-workflow-definition';

/**
 * W7b — Merge.
 *
 * Three layers, asserted separately because they fail differently:
 *
 * 1. the pure join helper (join semantics need no evaluator),
 * 2. the schema (a stored graph cannot smuggle in an invented mode),
 * 3. the shared validator (a `by_key` merge with no key is a save-time error, and the schema cannot
 *    express that rule because a `.refine()` would break the discriminated union).
 *
 * The walker's convergence pass is proven end-to-end in `lab-workflow-merge-convergence.test.ts`,
 * which needs a database.
 */

function item(json: Record<string, unknown>): LabWorkflowItem {
  return { json };
}

function envelope(): LabDomainEventEnvelopeV1 {
  return {
    id: 'evt-merge',
    type: 'task.created',
    sourceAppId: 'task-list',
    occurredAt: '2026-10-19T12:00:00.000Z',
    payload: { taskId: 't-1' },
    schemaVersion: 1,
  } as LabDomainEventEnvelopeV1;
}

describe('applyMergeItems — append', () => {
  test('concatenates branches in the order given', () => {
    const result = applyMergeItems(
      [
        [item({ id: 'a1' }), item({ id: 'a2' })],
        [item({ id: 'b1' })],
      ],
      'append',
      undefined,
      false,
      'merge-1',
    );
    expect(result.items.map((row) => row.json.id)).toEqual(['a1', 'a2', 'b1']);
    expect(result.detail).toMatchObject({ mode: 'append', merged: 3, branches: 2 });
  });

  test('an empty branch contributes no rows and does not empty the result', () => {
    const result = applyMergeItems(
      [[item({ id: 'a1' })], [], [item({ id: 'c1' })]],
      'append',
      undefined,
      false,
      'merge-1',
    );
    expect(result.items.map((row) => row.json.id)).toEqual(['a1', 'c1']);
    expect(result.detail).toMatchObject({ populatedBranches: 2, merged: 2 });
  });

  test('all branches empty is an empty result, not an error', () => {
    const result = applyMergeItems([[], []], 'append', undefined, false, 'merge-1');
    expect(result.items).toEqual([]);
    expect(result.detail).toMatchObject({ merged: 0 });
  });

  test('restamps provenance to the merge node', () => {
    const result = applyMergeItems([[item({ id: 'a1' })]], 'append', undefined, false, 'merge-1');
    expect(result.items[0]?.pairedItem).toEqual({ nodeId: 'merge-1', itemIndex: 0 });
  });
});

describe('applyMergeItems — by_index', () => {
  test('pairs row N of each branch under the branch index', () => {
    const result = applyMergeItems(
      [
        [item({ id: 'a1' }), item({ id: 'a2' })],
        [item({ id: 'b1' }), item({ id: 'b2' })],
      ],
      'by_index',
      undefined,
      false,
      'merge-1',
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.json).toEqual({ '0': { id: 'a1' }, '1': { id: 'b1' } });
    expect(result.items[1]?.json).toEqual({ '0': { id: 'a2' }, '1': { id: 'b2' } });
    expect(result.detail).toMatchObject({ mode: 'by_index', merged: 2, pairs: 2, unmatched: 0 });
  });

  test('colliding field names do not overwrite each other', () => {
    // The reason rows are nested by branch index: two branches both carrying `id` would otherwise
    // leave only the second branch's value — silent data loss that no count would reveal.
    const result = applyMergeItems(
      [[item({ id: 'a1' })], [item({ id: 'b1' })]],
      'by_index',
      undefined,
      false,
      'merge-1',
    );
    expect(result.items[0]?.json).toEqual({ '0': { id: 'a1' }, '1': { id: 'b1' } });
  });

  test('a shorter branch drops its unpaired rows by default and counts them', () => {
    const result = applyMergeItems(
      [[item({ id: 'a1' }), item({ id: 'a2' }), item({ id: 'a3' })], [item({ id: 'b1' })]],
      'by_index',
      undefined,
      false,
      'merge-1',
    );
    expect(result.items).toHaveLength(1);
    expect(result.detail).toMatchObject({ pairs: 1, unmatched: 2 });
  });

  test('includeUnpaired keeps the extra rows and still reports them', () => {
    const result = applyMergeItems(
      [[item({ id: 'a1' }), item({ id: 'a2' })], [item({ id: 'b1' })]],
      'by_index',
      undefined,
      true,
      'merge-1',
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[1]?.json).toEqual({ '0': { id: 'a2' } });
    expect(result.detail).toMatchObject({ pairs: 1, unmatched: 1 });
  });
});

describe('applyMergeItems — by_key', () => {
  test('joins later branches into the base row on the key', () => {
    const result = applyMergeItems(
      [
        [item({ taskId: 't-1', title: 'One' }), item({ taskId: 't-2', title: 'Two' })],
        [item({ taskId: 't-1', ownerId: 7 }), item({ taskId: 't-2', ownerId: 8 })],
      ],
      'by_key',
      'taskId',
      false,
      'merge-1',
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.json).toEqual({ taskId: 't-1', title: 'One', ownerId: 7 });
    expect(result.items[1]?.json).toEqual({ taskId: 't-2', title: 'Two', ownerId: 8 });
    expect(result.detail).toMatchObject({ pairs: 2, unmatched: 0, matchedBranches: 2 });
  });

  test('a later branch wins on a conflicting field', () => {
    const result = applyMergeItems(
      [[item({ id: 'x', status: 'open' })], [item({ id: 'x', status: 'closed' })]],
      'by_key',
      'id',
      false,
      'merge-1',
    );
    expect(result.items[0]?.json.status).toBe('closed');
  });

  test('unmatched base rows are dropped by default and counted', () => {
    const result = applyMergeItems(
      [[item({ id: 'x' }), item({ id: 'y' })], [item({ id: 'x' })]],
      'by_key',
      'id',
      false,
      'merge-1',
    );
    expect(result.items).toHaveLength(1);
    // The unmatched count is the only signal a user gets: the run still "succeeds".
    expect(result.detail).toMatchObject({ pairs: 1, unmatched: 1, merged: 1 });
  });

  test('includeUnpaired keeps the base row alone', () => {
    const result = applyMergeItems(
      [[item({ id: 'x' }), item({ id: 'y' })], [item({ id: 'x' })]],
      'by_key',
      'id',
      true,
      'merge-1',
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[1]?.json).toEqual({ id: 'y' });
  });

  test('numbers and strings join on the same key', () => {
    const result = applyMergeItems(
      [[item({ id: 1 })], [item({ id: '1', extra: true })]],
      'by_key',
      'id',
      false,
      'merge-1',
    );
    expect(result.items[0]?.json).toMatchObject({ extra: true });
  });

  test('a missing key value never joins', () => {
    const result = applyMergeItems(
      [[item({ id: 'x' }), item({})], [item({ id: 'x' }), item({})]],
      'by_key',
      'id',
      true,
      'merge-1',
    );
    // Two base rows: one matched, one has no key of its own so it stays alone.
    expect(result.items).toHaveLength(2);
    expect(result.detail).toMatchObject({ pairs: 1, unmatched: 1 });
  });

  test('a duplicate key in a later branch keeps the first match', () => {
    const result = applyMergeItems(
      [[item({ id: 'x' })], [item({ id: 'x', n: 1 }), item({ id: 'x', n: 2 })]],
      'by_key',
      'id',
      false,
      'merge-1',
    );
    // Fanning out is a different node; multiplying rows silently would be the surprising behaviour.
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.json.n).toBe(1);
  });

  test('a missing key path falls back to append and says so', () => {
    const result = applyMergeItems(
      [[item({ id: 'a' })], [item({ id: 'b' })]],
      'by_key',
      undefined,
      false,
      'merge-1',
    );
    expect(result.items).toHaveLength(2);
    expect(result.detail).toMatchObject({ mode: 'by_key', warning: 'missing_key_path' });
  });
});

const ID = {
  trigger: '00000000-0000-4000-8000-000000000001',
  left: '00000000-0000-4000-8000-000000000002',
  right: '00000000-0000-4000-8000-000000000003',
  merge: '00000000-0000-4000-8000-000000000004',
  e1: '00000000-0000-4000-8000-000000000011',
  e2: '00000000-0000-4000-8000-000000000012',
  e3: '00000000-0000-4000-8000-000000000013',
  e4: '00000000-0000-4000-8000-000000000014',
};

function definition(step: LabWorkflowStepV1): LabWorkflowDefinitionV2 {
  const nodes: LabWorkflowGraphNodeV2[] = [
    { id: ID.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'task.created' },
    {
      id: ID.left,
      kind: 'action',
      position: { x: 1, y: 0 },
      step: { kind: 'split_out', path: 'tags' },
    },
    {
      id: ID.right,
      kind: 'action',
      position: { x: 1, y: 1 },
      step: { kind: 'split_out', path: 'tags' },
    },
    { id: ID.merge, kind: 'action', position: { x: 2, y: 0 }, step },
  ];
  const edges: LabWorkflowGraphEdgeV2[] = [
    { id: ID.e1, source: ID.trigger, target: ID.left, when: 'always' },
    { id: ID.e2, source: ID.trigger, target: ID.right, when: 'always' },
    { id: ID.e3, source: ID.left, target: ID.merge, when: 'always' },
    { id: ID.e4, source: ID.right, target: ID.merge, when: 'always' },
  ];
  return { schemaVersion: 2, nodes, edges };
}

describe('merge_items schema (gate G2)', () => {
  test.each([
    ['append', { kind: 'merge_items', mode: 'append' }],
    ['by_index', { kind: 'merge_items', mode: 'by_index' }],
    ['by_key with a key', { kind: 'merge_items', mode: 'by_key', keyPath: 'taskId' }],
    ['includeUnpaired', { kind: 'merge_items', mode: 'by_key', keyPath: 'taskId', includeUnpaired: true }],
  ])('accepts %s', (_name, step) => {
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(true);
  });

  test.each([
    ['an unknown mode', { kind: 'merge_items', mode: 'outer' }],
    ['a mode that is missing', { kind: 'merge_items' }],
    ['a numeric key path', { kind: 'merge_items', mode: 'by_key', keyPath: 7 }],
  ])('rejects %s', (_name, step) => {
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(false);
  });
});

describe('merge_items validator (gate G3)', () => {
  test('by_key with no key path is an error, not a warning', () => {
    const result = validateWorkflowDefinition(definition({ kind: 'merge_items', mode: 'by_key' }));
    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain('merge_missing_key');
  });

  test('by_key with a key path validates', () => {
    const result = validateWorkflowDefinition(
      definition({ kind: 'merge_items', mode: 'by_key', keyPath: 'taskId' }),
    );
    expect(result.errors).toEqual([]);
  });

  test('append with two incoming edges validates cleanly', () => {
    const result = validateWorkflowDefinition(definition({ kind: 'merge_items', mode: 'append' }));
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((issue) => issue.code)).not.toContain('merge_single_branch');
  });

  test('a merge with one incoming edge warns rather than blocks', () => {
    const definitionOneEdge: LabWorkflowDefinitionV2 = {
      schemaVersion: 2,
      nodes: [
        { id: ID.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'task.created' },
        {
          id: ID.merge,
          kind: 'action',
          position: { x: 1, y: 0 },
          step: { kind: 'merge_items', mode: 'append' },
        },
      ],
      edges: [{ id: ID.e1, source: ID.trigger, target: ID.merge, when: 'always' }],
    };
    const result = validateWorkflowDefinition(definitionOneEdge);
    expect(result.valid).toBe(true);
    expect(result.warnings.map((issue) => issue.code)).toContain('merge_single_branch');
  });

  test('summarizeValidation reports the blocking error', () => {
    const result = validateWorkflowDefinition(definition({ kind: 'merge_items', mode: 'by_key' }));
    expect(summarizeValidation(result)).toContain('1 error');
  });
});

describe('flattening contract the walker relies on', () => {
  test('the flattened list and the branch list agree on the row count', () => {
    // `runActionNode` passes `items` (flattened, for `itemsInCount`) and `branchItems` (boundaries,
    // for the join). The two must describe the same rows, or the run panel's in-count lies.
    const branches: LabWorkflowItem[][] = [[item({ id: 'a' })], [item({ id: 'b' }), item({ id: 'c' })]];
    expect(branches.flat()).toHaveLength(3);
    expect(applyMergeItems(branches, 'append', undefined, false, 'm').items).toHaveLength(3);
  });

  test('an unreached branch is an empty array, so append still yields the reached rows', () => {
    // This is the shape the convergence pass produces for a branch that never ran: an entry that
    // exists but holds nothing. The alternative would be an absent entry, and every consumer would
    // then have to decide whether "absent" meant "no rows yet" or "will never arrive".
    const result = applyMergeItems(
      [[item({ id: 'a' })], []],
      'append',
      undefined,
      false,
      'm',
    );
    expect(result.items.map((row) => row.json.id)).toEqual(['a']);
  });

  test('envelope fixture is independently reachable', () => {
    expect(envelope().payload).toEqual({ taskId: 't-1' });
  });
});
