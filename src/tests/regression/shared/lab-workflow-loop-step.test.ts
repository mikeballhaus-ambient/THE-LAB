import { describe, expect, test } from '@jest/globals';
import { applySetFields } from '@/shared/utils/lab-workflow-item-transforms';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';
import {
  edgeBranchFromSourceHandle,
  labWorkflowBranchHandlesForNode,
  labWorkflowNodeHasBranchOutputs,
} from '@/shared/utils/lab-workflow-graph-branch-handles';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import { buildDemoWebhookLoopWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-webhook-loop';
import { validateWorkflowDefinition } from '@/shared/utils/validate-lab-workflow-definition';

function item(json: Record<string, unknown>): LabWorkflowItem {
  return { json, pairedItem: { nodeId: 'seed', itemIndex: 0 } };
}

function loopNode(step: unknown): LabWorkflowGraphNodeV2 {
  return {
    id: 'loop-1',
    kind: 'action',
    position: { x: 0, y: 0 },
    step,
  } as LabWorkflowGraphNodeV2;
}

describe('loop step schema', () => {
  test('accepts a bounded loop', () => {
    expect(LabWorkflowStepSchema.safeParse({ kind: 'loop', maxIterations: 3 }).success).toBe(true);
  });

  test('rejects a missing cap', () => {
    // An uncapped loop in a user-authored graph is a hang, so the cap is required, not defaulted.
    expect(LabWorkflowStepSchema.safeParse({ kind: 'loop' }).success).toBe(false);
  });

  test('rejects a cap above the maximum', () => {
    expect(LabWorkflowStepSchema.safeParse({ kind: 'loop', maxIterations: 101 }).success).toBe(false);
  });

  test('accepts an optional while condition', () => {
    const parsed = LabWorkflowStepSchema.safeParse({
      kind: 'loop',
      maxIterations: 2,
      while: [{ kind: 'payload_equals', path: 'stop', value: false }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('wait seconds unit', () => {
  test('accepts a three-second wait', () => {
    expect(
      LabWorkflowStepSchema.safeParse({ kind: 'wait', amount: 3, unit: 'seconds' }).success,
    ).toBe(true);
  });

  test('rejects a wait in seconds above its own cap', () => {
    expect(
      LabWorkflowStepSchema.safeParse({ kind: 'wait', amount: 301, unit: 'seconds' }).success,
    ).toBe(false);
  });

  test('keeps the 30-unit cap for longer waits', () => {
    expect(
      LabWorkflowStepSchema.safeParse({ kind: 'wait', amount: 31, unit: 'days' }).success,
    ).toBe(false);
  });
});

describe('set_fields is shaping only', () => {
  test('literal writes the value it was given', () => {
    const result = applySetFields(
      [item({ other: 1 })],
      [{ path: 'status', source: 'literal', value: 'open' }],
      {},
      'shape',
    );
    expect(result.items[0].json.status).toBe('open');
  });

  test('from_payload copies a path from the item', () => {
    const result = applySetFields(
      [item({ nested: { id: 7 } })],
      [{ path: 'taskId', source: 'from_payload', value: 'nested.id' }],
      {},
      'shape',
    );
    expect(result.items[0].json.taskId).toBe(7);
  });

  test('never reads the destination before writing', () => {
    // The property that separates shaping from mutation: a pre-existing value at `path` is replaced,
    // not combined. If this ever starts returning 3, something has reintroduced read-modify-write.
    const result = applySetFields(
      [item({ count: 2 })],
      [{ path: 'count', source: 'literal', value: 1 }],
      {},
      'shape',
    );
    expect(result.items[0].json.count).toBe(1);
  });

  test('rejects the removed increment source at save time', () => {
    expect(
      LabWorkflowStepSchema.safeParse({
        kind: 'set_fields',
        fields: [{ path: 'count', source: 'increment', value: null }],
      }).success,
    ).toBe(false);
  });
});

describe('loop branch handles', () => {
  test('a loop node offers two outputs', () => {
    const node = loopNode({ kind: 'loop', maxIterations: 3 });
    expect(labWorkflowNodeHasBranchOutputs(node)).toBe(true);
    const handles = labWorkflowBranchHandlesForNode(node);
    expect(handles.map((handle) => handle.label)).toEqual(['While', 'Done']);
  });

  test('body and done map to ports 0 and 1', () => {
    const node = loopNode({ kind: 'loop', maxIterations: 3 });
    expect(edgeBranchFromSourceHandle(node, 'body')).toEqual({ when: 'always', outputIndex: 0 });
    expect(edgeBranchFromSourceHandle(node, 'done')).toEqual({ when: 'always', outputIndex: 1 });
  });
});

describe('webhook loop demo seed', () => {
  const definition = buildDemoWebhookLoopWorkflowDefinition();

  test('validates clean', () => {
    const result = validateWorkflowDefinition(definition);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('has exactly one trigger and one loop', () => {
    expect(definition.nodes.filter((node) => node.kind === 'trigger')).toHaveLength(1);
    const loops = definition.nodes.filter(
      (node) => node.kind === 'action' && node.step.kind === 'loop',
    );
    expect(loops).toHaveLength(1);
  });

  test('the body closes a cycle back to the loop', () => {
    const loop = definition.nodes.find(
      (node) => node.kind === 'action' && node.step.kind === 'loop',
    )!;
    // Port 0 leaves the loop; something downstream must return to it, or this is not a loop.
    const bodyEdge = definition.edges.find(
      (edge) => edge.source === loop.id && edge.outputIndex === 0,
    );
    expect(bodyEdge).toBeDefined();
    expect(definition.edges.some((edge) => edge.target === loop.id && edge.source !== loop.id && edge !== bodyEdge)).toBe(
      true,
    );
  });

  test('done leads to an IF that splits exhausted from completed', () => {
    const loop = definition.nodes.find(
      (node) => node.kind === 'action' && node.step.kind === 'loop',
    )!;
    const doneEdge = definition.edges.find(
      (edge) => edge.source === loop.id && edge.outputIndex === 1,
    )!;
    const branch = definition.nodes.find((node) => node.id === doneEdge.target)!;
    expect(branch.kind === 'action' && branch.step.kind).toBe('if_condition');
    const outgoing = definition.edges.filter((edge) => edge.source === branch.id);
    expect(outgoing).toHaveLength(2);
  });

  test('the body advances the counter with a code node, not set_fields', () => {
    // Shaping and mutation are different jobs: `set_fields` maps payload → output and never reads its
    // destination, so the counter step has to be a node that admits to being arithmetic.
    const advance = definition.nodes.find(
      (node) => node.kind === 'action' && node.step.kind === 'code',
    );
    expect(advance).toBeDefined();
    const step = advance!.kind === 'action' ? advance!.step : null;
    expect(step && step.kind === 'code' ? step.source : '').toContain('stepValue');
  });
});
