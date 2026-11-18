import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphNodeV2,
  LabWorkflowGraphPosition,
  LabWorkflowGraphViewport,
} from '@/shared/types/lab-workflow-graph';

/** Viewport persisted when the author never panned/zoomed or fit-view was not saved. */
export function isLabWorkflowDefaultViewport(viewport: LabWorkflowGraphViewport | undefined): boolean {
  if (!viewport) {
    return true;
  }
  const { x, y, zoom } = viewport;
  return Math.abs(x) < 0.5 && Math.abs(y) < 0.5 && Math.abs(zoom - 1) < 0.01;
}

/**
 * Whether a graph carries **no** authored layout — every node sitting at the origin.
 *
 * This is the signal a seed uses to decide whether arranging is allowed. `0,0` is not a real layout;
 * it is what a seed module writes when it does not care where the boxes go. Any non-zero position
 * means somebody made a decision about placement, and re-arranging would throw it away.
 */
export function labWorkflowHasNoAuthoredLayout(
  def: Pick<LabWorkflowDefinitionV2, 'nodes'>,
): boolean {
  return def.nodes.every((node) => node.position.x === 0 && node.position.y === 0);
}

/**
 * Arrange a seed graph **only when it has no authored layout**.
 *
 * Seeds are authored as nodes-in-a-list; positions come from the arranger. But once a graph has been
 * laid out — or a user has dragged it — arranging again is destructive: it silently replaces real
 * coordinates with computed ones. Guarding on "every node is at 0,0" keeps both properties: a
 * positionless seed still gets a readable canvas, and a seed that states its layout is left alone.
 *
 * The rule is all-or-nothing per graph, not per node: a half-arranged graph would mean half the nodes
 * jump, which looks like a bug even when the arithmetic is right.
 */
export function arrangeSeedLayoutIfUnpositioned(
  def: Pick<LabWorkflowDefinitionV2, 'nodes' | 'edges'>,
  arrange: (
    def: Pick<LabWorkflowDefinitionV2, 'nodes' | 'edges'>,
    options: { direction: 'LR' | 'TB' },
  ) => LabWorkflowGraphNodeV2[],
): LabWorkflowGraphNodeV2[] {
  if (!labWorkflowHasNoAuthoredLayout(def)) {
    return def.nodes;
  }
  return arrange(def, { direction: 'LR' });
}

/**
 * A definition with canvas layout stripped: node positions flattened and viewport reset.
 *
 * Layout is the author's work, not the seed's data. Two definitions that differ only here describe
 * the **same automation** arranged on the canvas differently — so anything comparing a stored
 * workflow against a code seed must compare this, not the raw JSON. Comparing raw JSON is what made
 * a backend restart silently snap every demo graph back to auto-arrange.
 */
export function stripLabWorkflowCanvasLayout(
  def: Pick<LabWorkflowDefinitionV2, 'nodes'> & Partial<Pick<LabWorkflowDefinitionV2, 'viewport'>>,
): LabWorkflowDefinitionV2 {
  return {
    ...(def as LabWorkflowDefinitionV2),
    nodes: def.nodes.map((node) => ({ ...node, position: { x: 0, y: 0 } })),
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/** A stable string for "is this the same automation", ignoring where the boxes sit on the canvas. */
export function labWorkflowDefinitionContentKey(
  def: Pick<LabWorkflowDefinitionV2, 'nodes'> & Partial<Pick<LabWorkflowDefinitionV2, 'viewport'>>,
): string {
  return JSON.stringify(stripLabWorkflowCanvasLayout(def));
}

/**
 * Apply the seed's **content** but keep the author's **layout**.
 *
 * Nodes are matched by id, so a node the author dragged stays where they left it. A node the seed
 * added has no stored position and takes the seed's arranged position — which is the only case where
 * auto-arrange should decide anything. The viewport is likewise preserved: a graph that reopens at a
 * different scroll position looks like it moved even when every node did not.
 */
export function preserveLabWorkflowCanvasLayout(
  next: LabWorkflowDefinitionV2,
  existing: LabWorkflowDefinitionV2 | null | undefined,
): LabWorkflowDefinitionV2 {
  if (!existing) {
    return next;
  }
  const positionById = new Map<string, LabWorkflowGraphPosition>(
    existing.nodes.map((node: LabWorkflowGraphNodeV2) => [node.id, node.position]),
  );
  return {
    ...next,
    nodes: next.nodes.map((node) => {
      const position = positionById.get(node.id);
      return position ? { ...node, position: { x: position.x, y: position.y } } : node;
    }),
    viewport: existing.viewport ?? next.viewport,
  };
}
