import { describe, expect, test } from '@jest/globals';
import type { LabWorkflowGraphEdgeV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import {
  dedupeLabWorkflowGraphEdges,
  labWorkflowGraphEdgesHaveDuplicates,
  labWorkflowOutgoingBranchLabel,
  normalizeLabWorkflowEdgeBranch,
} from '@/shared/utils/lab-workflow-graph-edge';
import { labWorkflowNodeHasBranchOutputs } from '@/shared/utils/lab-workflow-graph-branch-handles';

/**
 * Regressions for the webhook-loop demo row, which stored the same edge twice.
 *
 * The canvas keys edges by `id`, so a repeated id renders as one connector while the array holds two:
 * the details panel lists the branch twice and the shadowed entry can never be selected — the user
 * has no affordance to clear it. These tests pin the two guards that stop it recurring:
 * `dedupeLabWorkflowGraphEdges` heals the data, and `normalizeLabWorkflowEdgeBranch` stops the
 * "Run this branch when" edit from being undone on the next save.
 */

function edge(overrides: Partial<LabWorkflowGraphEdgeV2> = {}): LabWorkflowGraphEdgeV2 {
  return {
    id: 'e-1',
    source: 'n-if',
    target: 'n-out',
    when: 'on_false',
    ...overrides,
  } as LabWorkflowGraphEdgeV2;
}

function ifNode(): LabWorkflowGraphNodeV2 {
  return {
    id: 'n-if',
    kind: 'action',
    position: { x: 0, y: 0 },
    step: { kind: 'if_condition', conditions: [{ kind: 'payload_exists', path: 'stepValue' }] },
  } as LabWorkflowGraphNodeV2;
}

function loopNode(): LabWorkflowGraphNodeV2 {
  return {
    id: 'n-if',
    kind: 'action',
    position: { x: 0, y: 0 },
    step: { kind: 'loop', maxIterations: 3 },
  } as LabWorkflowGraphNodeV2;
}

describe('dedupeLabWorkflowGraphEdges', () => {
  test('keeps one of two edges that share an id', () => {
    const result = dedupeLabWorkflowGraphEdges([
      edge({ id: 'c5c5d4f1', when: 'on_false', outputIndex: 1 }),
      edge({ id: 'c5c5d4f1', when: 'on_false', outputIndex: 1 }),
    ]);
    expect(result.edges).toHaveLength(1);
    expect(result.removedIds).toEqual(['c5c5d4f1']);
  });

  test('collapses two ids that describe the same route', () => {
    // Different ids but an identical branch: once one is drawn the other has no handle of its own,
    // so it is just as unreachable as an id collision.
    const result = dedupeLabWorkflowGraphEdges([
      edge({ id: 'a', when: 'on_false', outputIndex: 1 }),
      edge({ id: 'b', when: 'on_false', outputIndex: 1 }),
    ]);
    expect(result.edges.map((e) => e.id)).toEqual(['a']);
  });

  test('keeps both IF branches apart', () => {
    // Guard against over-collapsing: true and false are different routes and must survive.
    const result = dedupeLabWorkflowGraphEdges([
      edge({ id: 'a', when: 'on_true', outputIndex: 0 }),
      edge({ id: 'b', when: 'on_false', outputIndex: 1 }),
    ]);
    expect(result.edges).toHaveLength(2);
    expect(result.removedIds).toEqual([]);
  });

  test('keeps both loop exits apart when only the port differs', () => {
    const result = dedupeLabWorkflowGraphEdges([
      edge({ id: 'body', when: 'always', outputIndex: 0 }),
      edge({ id: 'done', when: 'always', outputIndex: 1 }),
    ]);
    expect(result.edges).toHaveLength(2);
  });

  test('reports whether a definition needs healing', () => {
    expect(labWorkflowGraphEdgesHaveDuplicates([edge({ id: 'a' })])).toBe(false);
    expect(labWorkflowGraphEdgesHaveDuplicates([edge({ id: 'a' }), edge({ id: 'a' })])).toBe(true);
  });
});

describe('normalizeLabWorkflowEdgeBranch', () => {
  test('an IF edge switched to Always drops its port', () => {
    // The regression: the panel wrote `when: always` but the stale `outputIndex: 1` still resolved
    // the drawn handle, so the change reverted. Dropping the index is what makes the edit stick.
    const result = normalizeLabWorkflowEdgeBranch(
      ifNode(),
      edge({ when: 'always', outputIndex: 1 }),
    );
    expect(result.when).toBe('always');
    expect(result.outputIndex).toBeUndefined();
  });

  test('an IF edge switched to on_true is pinned to port 0', () => {
    const result = normalizeLabWorkflowEdgeBranch(
      ifNode(),
      edge({ when: 'on_true', outputIndex: 1 }),
    );
    expect(result).toMatchObject({ when: 'on_true', outputIndex: 0 });
  });

  test('an IF edge switched to on_false is pinned to port 1', () => {
    const result = normalizeLabWorkflowEdgeBranch(
      ifNode(),
      edge({ when: 'on_false', outputIndex: 0 }),
    );
    expect(result).toMatchObject({ when: 'on_false', outputIndex: 1 });
  });

  test('a loop edge keeps its port', () => {
    // A loop has no branch condition — the port *is* the route. Clearing it would merge While and
    // Done into one edge and break the cycle.
    const result = normalizeLabWorkflowEdgeBranch(
      loopNode(),
      edge({ when: 'always', outputIndex: 1 }),
    );
    expect(result.outputIndex).toBe(1);
  });

  test('a condition node carries its branch in when, not a port', () => {
    const condition: LabWorkflowGraphNodeV2 = {
      id: 'n-if',
      kind: 'condition',
      position: { x: 0, y: 0 },
      conditions: [{ kind: 'payload_exists', path: 'x' }],
    } as LabWorkflowGraphNodeV2;
    const result = normalizeLabWorkflowEdgeBranch(
      condition,
      edge({ when: 'on_true', outputIndex: 0 }),
    );
    expect(result.when).toBe('on_true');
    expect(result.outputIndex).toBeUndefined();
  });
});

describe('next-steps names every multi-output node', () => {
  // The details panel decided whether to show branch names from a `show-branches` prop that each
  // template branch passed by hand. The Loop shares the generic action template with single-output
  // steps, so it was missed and listed its two exits as bare arrows — the author could not tell
  // While from Done. Deriving the flag from the node closes that gap for every node kind at once.
  test('IF, rule and loop are all recognised as multi-output', () => {
    const ifAction = ifNode();
    const loop = loopNode();
    const rule: LabWorkflowGraphNodeV2 = {
      id: 'n-rule',
      kind: 'rule',
      position: { x: 0, y: 0 },
      name: 'Has assignee',
      conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
    } as LabWorkflowGraphNodeV2;
    const condition: LabWorkflowGraphNodeV2 = {
      id: 'n-cond',
      kind: 'condition',
      position: { x: 0, y: 0 },
      conditions: [{ kind: 'payload_exists', path: 'x' }],
    } as LabWorkflowGraphNodeV2;

    for (const node of [ifAction, loop, rule, condition]) {
      expect(labWorkflowNodeHasBranchOutputs(node)).toBe(true);
    }
  });

  test('a single-output action is not treated as branching', () => {
    const notify: LabWorkflowGraphNodeV2 = {
      id: 'n-notify',
      kind: 'action',
      position: { x: 0, y: 0 },
      step: { kind: 'notify_users', userIds: [1] },
    } as LabWorkflowGraphNodeV2;
    expect(labWorkflowNodeHasBranchOutputs(notify)).toBe(false);
  });

  test('both loop exits get distinct, meaningful labels', () => {
    // The visible symptom: two arrows with no way to tell which was While and which was Done.
    const loop = loopNode();
    const whileLabel = labWorkflowOutgoingBranchLabel(loop, edge({ when: 'always', outputIndex: 0 }));
    const doneLabel = labWorkflowOutgoingBranchLabel(loop, edge({ when: 'always', outputIndex: 1 }));
    expect(whileLabel).toBe('While branch');
    expect(doneLabel).toBe('Done branch');
    expect(whileLabel).not.toBe(doneLabel);
  });
});

describe('labWorkflowOutgoingBranchLabel on a loop', () => {
  test('names the ports instead of borrowing IF wording', () => {
    // The details panel used to fall through to the generic `when` list, so a loop's exits were
    // labelled as if they were an IF branch — disagreeing with the While/Done labels on the node.
    expect(labWorkflowOutgoingBranchLabel(loopNode(), edge({ when: 'always', outputIndex: 0 }))).toBe(
      'While branch',
    );
    expect(labWorkflowOutgoingBranchLabel(loopNode(), edge({ when: 'always', outputIndex: 1 }))).toBe(
      'Done branch',
    );
  });
});
