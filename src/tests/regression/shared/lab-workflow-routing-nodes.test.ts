import { describe, expect, test } from '@jest/globals';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowItem, LabWorkflowNodeOutput } from '@/shared/types/lab-workflow-items';
import {
  labWorkflowOutgoingBranchLabel,
  outgoingEdges,
  resolveIfOutgoingBranchLabels,
} from '@/shared/utils/lab-workflow-graph-edge';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import { applySplitOut } from '@/shared/utils/lab-workflow-item-transforms';
import {
  runWorkflowStep,
  type WorkflowStepOutcome,
} from '@/backend/lab-workflows/lab-workflow-step-runner';

/**
 * W7 — flow control: IF, Switch, Split Out, and the edge-port rule they depend on.
 *
 * The phase's whole point is that `LabWorkflowNodeOutput.outputIndex` is finally **read**: before
 * this, `outgoingEdges()` was called with `{}` for action nodes, so a Switch's branches were
 * decorative. These tests assert the port rule directly, because that is the piece a later change
 * is most likely to break without noticing.
 */

function items(...rows: Record<string, unknown>[]): LabWorkflowItem[] {
  return rows.map((json, itemIndex) => ({ json, pairedItem: { nodeId: 'trigger', itemIndex } }));
}

const ENVELOPE: LabDomainEventEnvelopeV1 = {
  schemaVersion: 1,
  id: '11111111-1111-4111-8111-111111111111',
  type: 'app-lab-tasklist.task.created',
  sourceAppId: 'app-lab-tasklist',
  occurredAt: '2026-10-19T12:00:00.000Z',
  actorUserId: 1,
  payload: {},
};

const OPTIONS = {};

/**
 * Run one step and return its output.
 *
 * The explicit `LabWorkflowStepV1` parameter is what keeps the fixtures honest: an inline literal
 * widens `kind` to `string`, which would let a typo in the discriminant pass type checking and fail
 * only at run time with "unknown step kind".
 */
async function runStep(
  step: LabWorkflowStepV1,
  inputItems: LabWorkflowItem[],
): Promise<{ output: LabWorkflowNodeOutput; detail?: Record<string, unknown> }> {
  const outcome: WorkflowStepOutcome = await runWorkflowStep({
    step,
    envelope: ENVELOPE,
    workflowName: 'routing fixture',
    items: inputItems,
    nodeId: 'n-test',
    options: OPTIONS,
  });
  if (outcome.kind === 'abort') {
    throw new Error(`expected continue, got abort: ${outcome.reason}`);
  }
  if (outcome.kind === 'suspend') {
    // Routing nodes never suspend; a `wait` sneaking in here means the fixture is wrong.
    throw new Error(`expected continue, got suspend until ${outcome.resumeAt}`);
  }
  return { output: outcome.output, detail: outcome.detail };
}

describe('labWorkflowOutgoingBranchLabel', () => {
  const ifNode: LabWorkflowGraphNodeV2 = {
    id: 'if-1',
    kind: 'action',
    position: { x: 0, y: 0 },
    step: { kind: 'if_condition', conditions: [{ kind: 'payload_exists', path: 'assigneeId' }] },
  };

  test('maps IF outputIndex to true/false branch labels', () => {
    expect(
      labWorkflowOutgoingBranchLabel(ifNode, { when: 'always', outputIndex: 0 }),
    ).toBe('True branch');
    expect(
      labWorkflowOutgoingBranchLabel(ifNode, { when: 'always', outputIndex: 1 }),
    ).toBe('False branch');
  });

  test('infers true/false when IF edges lack outputIndex', () => {
    const edges = [
      {
        id: 'e-a',
        source: 'if-1',
        target: 'a',
        when: 'always' as const,
        label: 'No assignee',
      },
      {
        id: 'e-b',
        source: 'if-1',
        target: 'b',
        when: 'always' as const,
      },
    ];
    const labels = resolveIfOutgoingBranchLabels(ifNode, edges);
    expect(labels.get('e-a')).toBe('True branch');
    expect(labels.get('e-b')).toBe('False branch');
  });
});

describe('edge ports (W7)', () => {
  const edges = [
    { id: 'e0', source: 'n', target: 'a', when: 'always' as const, outputIndex: 0 },
    { id: 'e1', source: 'n', target: 'b', when: 'always' as const, outputIndex: 1 },
    { id: 'e2', source: 'n', target: 'c', when: 'always' as const },
  ];

  test('an edge with an index is taken only on that port', () => {
    expect(outgoingEdges(edges, 'n', { outputIndex: 0 }).map((edge) => edge.id)).toEqual(['e0']);
    expect(outgoingEdges(edges, 'n', { outputIndex: 1 }).map((edge) => edge.id)).toEqual(['e1']);
  });

  test('an edge without an index is not taken on a routing node', () => {
    // Taking it would run `c` for every port — the "converging node runs twice" bug.
    expect(outgoingEdges(edges, 'n', { outputIndex: 2 }).map((edge) => edge.id)).toEqual([]);
  });

  test('an edge without an index is taken by a node with no ports', () => {
    // Every graph authored before W7 relies on this.
    expect(outgoingEdges(edges, 'n', {}).map((edge) => edge.id)).toEqual(['e2']);
  });

  test('when and port are both honoured', () => {
    const mixed = [
      { id: 'm0', source: 'n', target: 'a', when: 'on_match' as const, outputIndex: 0 },
      { id: 'm1', source: 'n', target: 'b', when: 'on_match' as const, outputIndex: 1 },
    ];
    expect(outgoingEdges(mixed, 'n', { ruleMatch: true, outputIndex: 1 }).map((e) => e.id)).toEqual([
      'm1',
    ]);
    expect(outgoingEdges(mixed, 'n', { ruleMatch: false, outputIndex: 1 })).toEqual([]);
  });
});

describe('F1 — if_condition', () => {
  test('sends passing items out of port 0 and reports both counts', async () => {
    const { output, detail } = await runStep(
      {
        kind: 'if_condition',
        conditions: [{ kind: 'payload_equals', path: 'status', value: 'open' }],
      },
      items(
        { id: 'a', status: 'open' },
        { id: 'b', status: 'done' },
        { id: 'c', status: 'open' },
      ),
    );

    expect(output.outputIndex).toBe(0);
    expect(output.branch).toBe('true');
    expect(output.items.map((item) => item.json.id)).toEqual(['a', 'c']);
    expect(detail).toMatchObject({ trueCount: 2, falseCount: 1, outputIndex: 0 });
  });

  test('sends failing items out of port 1 when nothing passes', async () => {
    const { output } = await runStep(
      {
        kind: 'if_condition',
        conditions: [{ kind: 'payload_equals', path: 'status', value: 'blocked' }],
      },
      items({ id: 'a', status: 'open' }, { id: 'b', status: 'done' }),
    );

    expect(output.outputIndex).toBe(1);
    expect(output.branch).toBe('false');
    expect(output.items.map((item) => item.json.id)).toEqual(['a', 'b']);
  });

  test('combine: any needs only one condition to hold', async () => {
    const { output } = await runStep(
      {
        kind: 'if_condition',
        combine: 'any',
        conditions: [
          { kind: 'payload_equals', path: 'status', value: 'done' },
          { kind: 'payload_equals', path: 'status', value: 'open' },
        ],
      },
      items({ id: 'a', status: 'done' }, { id: 'b', status: 'blocked' }, { id: 'c', status: 'open' }),
    );
    expect(output.items.map((item) => item.json.id)).toEqual(['a', 'c']);
  });
});

describe('F2 — switch_condition', () => {
  const step: LabWorkflowStepV1 = {
    kind: 'switch_condition',
    routings: [
      { label: 'High', conditions: [{ kind: 'payload_equals', path: 'priority', value: 'high' }] },
      { label: 'Low', conditions: [{ kind: 'payload_equals', path: 'priority', value: 'low' }] },
    ],
  };

  test.each([
    { name: 'first routing matches', row: { priority: 'high' }, port: 0, matched: 0 },
    { name: 'second routing matches', row: { priority: 'low' }, port: 1, matched: 1 },
    { name: 'nothing matches → fallback port', row: { priority: 'medium' }, port: 2, matched: -1 },
  ])('$name', async ({ row, port, matched }) => {
    const { output, detail } = await runStep(step, items(row));
    expect(output.outputIndex).toBe(port);
    expect(detail).toMatchObject({ outputIndex: port, matchedRouting: matched, fallback: 2 });
    // The Switch routes the batch; it does not drop rows.
    expect(output.items).toHaveLength(1);
  });

  test('a custom fallback port is honoured', async () => {
    const { output } = await runStep(
      { ...(step as Extract<LabWorkflowStepV1, { kind: 'switch_condition' }>), fallbackOutputIndex: 5 },
      items({ priority: 'medium' }),
    );
    expect(output.outputIndex).toBe(5);
  });
});

describe('F6 — split_out', () => {
  test('expands an object array, spreading elements and keeping the source index', () => {
    const result = applySplitOut(
      items(
        { id: 'order-1', lines: [{ sku: 'a', qty: 1 }, { sku: 'b', qty: 2 }] },
        { id: 'order-2', lines: [{ sku: 'c', qty: 3 }] },
      ),
      'lines',
      false,
      undefined,
      'n-split',
    );
    expect(result.items.map((item) => item.json.sku)).toEqual(['a', 'b', 'c']);
    expect(result.items.map((item) => item.pairedItem?.itemIndex)).toEqual([0, 0, 1]);
    expect(result.detail).toMatchObject({ expandedItems: 2, passthroughItems: 0, outCount: 3 });
  });

  test('includeOtherFields keeps the parent row alongside the expanded element', () => {
    const result = applySplitOut(
      items({ id: 'order-1', lines: [{ sku: 'a' }, { sku: 'b' }] }),
      'lines',
      true,
      undefined,
      'n-split',
    );
    expect(result.items.map((item) => item.json.id)).toEqual(['order-1', 'order-1']);
    expect(result.items.map((item) => item.json.sku)).toEqual(['a', 'b']);
  });

  test('a non-array path is passed through rather than dropped', () => {
    const result = applySplitOut(
      items({ id: 'a', lines: [{ sku: 'x' }] }, { id: 'b', lines: null }, { id: 'c' }),
      'lines',
      true,
      undefined,
      'n-split',
    );
    expect(result.items.map((item) => item.json.id)).toEqual(['a', 'b', 'c']);
    expect(result.detail).toMatchObject({ expandedItems: 1, passthroughItems: 2 });
  });

  test('targetPath writes the element without spreading it', () => {
    const result = applySplitOut(
      items({ id: 'a', lines: [1, 2] }),
      'lines',
      true,
      'line',
      'n-split',
    );
    expect(result.items.map((item) => item.json.line)).toEqual([1, 2]);
    expect(result.items.map((item) => item.json.id)).toEqual(['a', 'a']);
  });

  test('a scalar element array reuses the source path per item', () => {
    const result = applySplitOut(
      items({ id: 'a', tags: ['red', 'blue'] }),
      'tags',
      true,
      undefined,
      'n-split',
    );
    expect(result.items.map((item) => item.json.tags)).toEqual(['red', 'blue']);
  });
});
