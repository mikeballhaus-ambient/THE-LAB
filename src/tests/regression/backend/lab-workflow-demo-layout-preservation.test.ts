import { describe, expect, test } from '@jest/globals';
import {
  arrangeSeedLayoutIfUnpositioned,
  isLabWorkflowDefaultViewport,
  labWorkflowDefinitionContentKey,
  labWorkflowHasNoAuthoredLayout,
  preserveLabWorkflowCanvasLayout,
  stripLabWorkflowCanvasLayout,
} from '@/shared/utils/lab-workflow-graph-viewport';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/**
 * Layout preservation for seeded demo workflows.
 *
 * The bug these tests exist for: `syncDemoAutomationDefinitions()` compared the stored definition to
 * the code seed with a raw `JSON.stringify`, and the seed's definition is *produced by
 * auto-arrange*. Any graph the user had dragged therefore looked "modified" on every backend start,
 * so the sync rewrote it — replacing a hand-placed layout with auto-arrange's. The reported symptom
 * was "[it] is persisted … [until] I restart the lab, then positions get wonky".
 *
 * The invariant: a saved layout is never overwritten by a content sync.
 */

function def(
  positions: Record<string, { x: number; y: number }>,
  viewport = { x: 0, y: 0, zoom: 1 },
): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: 2,
    nodes: Object.entries(positions).map(([id, position]) => ({
      id,
      kind: 'action',
      position,
      step: { kind: 'notify_users', userIds: [1] },
    })),
    edges: [],
    viewport,
  } as LabWorkflowDefinitionV2;
}

describe('labWorkflowDefinitionContentKey', () => {
  test('two layouts of the same graph have the same content key', () => {
    const arranged = def({ a: { x: 48, y: 108 }, b: { x: 288, y: 108 } });
    const handPlaced = def({ a: { x: 10, y: 900 }, b: { x: 5000, y: 42 } });
    expect(labWorkflowDefinitionContentKey(handPlaced)).toBe(
      labWorkflowDefinitionContentKey(arranged),
    );
  });

  test('a content difference still shows up', () => {
    const before = def({ a: { x: 0, y: 0 } });
    const after = JSON.parse(JSON.stringify(before)) as LabWorkflowDefinitionV2;
    (after.nodes[0] as { step: unknown }).step = { kind: 'notify_users', userIds: [1, 2] };
    expect(labWorkflowDefinitionContentKey(after)).not.toBe(
      labWorkflowDefinitionContentKey(before),
    );
  });

  test('the viewport is excluded from content', () => {
    const a = def({ n: { x: 0, y: 0 } }, { x: 0, y: 0, zoom: 1 });
    const b = def({ n: { x: 0, y: 0 } }, { x: -420, y: 77, zoom: 1.4 });
    expect(labWorkflowDefinitionContentKey(b)).toBe(labWorkflowDefinitionContentKey(a));
  });

  test('strip flattens positions and resets the viewport', () => {
    const stripped = stripLabWorkflowCanvasLayout(
      def({ n: { x: 700, y: 300 } }, { x: -100, y: 5, zoom: 2 }),
    );
    expect(stripped.nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(stripped.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('preserveLabWorkflowCanvasLayout', () => {
  test('keeps the author’s position for a node the seed also has', () => {
    const seeded = def({ a: { x: 48, y: 108 }, b: { x: 288, y: 108 } });
    const stored = def({ a: { x: 900, y: 411 }, b: { x: 1200, y: 55 } });
    const merged = preserveLabWorkflowCanvasLayout(seeded, stored);
    expect(merged.nodes.find((n) => n.id === 'a')!.position).toEqual({ x: 900, y: 411 });
    expect(merged.nodes.find((n) => n.id === 'b')!.position).toEqual({ x: 1200, y: 55 });
  });

  test('a node the seed adds takes the seed’s arranged position', () => {
    // There is no stored position to preserve, so the arrange output is the only sane answer.
    const seeded = def({ a: { x: 48, y: 108 }, fresh: { x: 528, y: 108 } });
    const stored = def({ a: { x: 900, y: 411 } });
    const merged = preserveLabWorkflowCanvasLayout(seeded, stored);
    expect(merged.nodes.find((n) => n.id === 'fresh')!.position).toEqual({ x: 528, y: 108 });
  });

  test('keeps the author’s viewport', () => {
    const seeded = def({ a: { x: 0, y: 0 } }, { x: 0, y: 0, zoom: 1 });
    const stored = def({ a: { x: 5, y: 5 } }, { x: -300, y: 120, zoom: 0.8 });
    expect(preserveLabWorkflowCanvasLayout(seeded, stored).viewport).toEqual({
      x: -300,
      y: 120,
      zoom: 0.8,
    });
  });

  test('a node the seed removes is simply absent, so nothing resurrects it', () => {
    const seeded = def({ a: { x: 0, y: 0 } });
    const stored = def({ a: { x: 10, y: 10 }, retired: { x: 99, y: 99 } });
    const merged = preserveLabWorkflowCanvasLayout(seeded, stored);
    expect(merged.nodes.map((n) => n.id)).toEqual(['a']);
  });

  test('with no stored definition the seed layout is used as-is', () => {
    const seeded = def({ a: { x: 48, y: 108 } });
    expect(preserveLabWorkflowCanvasLayout(seeded, null)).toEqual(seeded);
  });

  test('a sync is idempotent — a second pass changes no position', () => {
    const seeded = def({ a: { x: 48, y: 108 }, b: { x: 288, y: 108 } });
    const stored = def({ a: { x: 777, y: 1 }, b: { x: 888, y: 2 } });
    const once = preserveLabWorkflowCanvasLayout(seeded, stored);
    const twice = preserveLabWorkflowCanvasLayout(seeded, once);
    expect(twice.nodes.map((n) => n.position)).toEqual(once.nodes.map((n) => n.position));
  });
});

describe('arranging is conditional on an absent layout', () => {
  test('every node at 0,0 counts as no authored layout', () => {
    expect(labWorkflowHasNoAuthoredLayout(def({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } }))).toBe(true);
  });

  test('a single moved node means the layout was authored', () => {
    expect(labWorkflowHasNoAuthoredLayout(def({ a: { x: 0, y: 0 }, b: { x: 5, y: 0 } }))).toBe(false);
  });

  test('an unpositioned seed is arranged', () => {
    const seed = def({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } });
    const arranged = arrangeSeedLayoutIfUnpositioned(seed, autoArrangeLabWorkflowGraph);
    // Arranging must actually produce layout, or "only arrange when unpositioned" is a no-op.
    expect(arranged.every((n) => n.position.x !== 0 || n.position.y !== 0)).toBe(true);
  });

  test('a positioned seed is left exactly as written', () => {
    // The rule the user asked for: positions in the seed win, and arranging never overrides them.
    const seed = def({ a: { x: 900, y: 40 }, b: { x: 1200, y: 40 } });
    const arranged = arrangeSeedLayoutIfUnpositioned(seed, autoArrangeLabWorkflowGraph);
    expect(arranged.map((n) => n.position)).toEqual([
      { x: 900, y: 40 },
      { x: 1200, y: 40 },
    ]);
  });

  test('arranging is all-or-nothing per graph', () => {
    // A half-arranged graph would move some nodes and leave others, which reads as a glitch.
    const seed = def({ a: { x: 0, y: 0 }, b: { x: 77, y: 0 } });
    const arranged = arrangeSeedLayoutIfUnpositioned(seed, autoArrangeLabWorkflowGraph);
    expect(arranged.map((n) => n.position)).toEqual([
      { x: 0, y: 0 },
      { x: 77, y: 0 },
    ]);
  });
});

describe('isLabWorkflowDefaultViewport', () => {
  test('treats a moved viewport as custom, so it is restored not fitted', () => {
    expect(isLabWorkflowDefaultViewport({ x: -300, y: 120, zoom: 0.8 })).toBe(false);
  });

  test('treats an untouched viewport as default', () => {
    expect(isLabWorkflowDefaultViewport({ x: 0, y: 0, zoom: 1 })).toBe(true);
    expect(isLabWorkflowDefaultViewport(undefined)).toBe(true);
  });
});
