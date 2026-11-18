import type { Edge, GraphNode, Node } from '@vue-flow/core';
import type {
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
  LabWorkflowGraphPosition,
} from '@/shared/types/lab-workflow-graph';
import { sourceHandleForWorkflowEdge } from '@/shared/utils/lab-workflow-graph-branch-handles';

/** Payload on Vue Flow nodes for the workflow graph designer. */
export interface LabWorkflowFlowNodeData {
  node: LabWorkflowGraphNodeV2;
  label: string;
  /** Overrides `node.kind` on the canvas card (e.g. lookup). */
  kindLabel?: string;
  /** Card title when `conditionLines` are shown (rule name, IF, Condition). */
  headline?: string;
  /** Readable condition summaries; first line shown with expand for the rest. */
  conditionLines?: string[];
  selected?: boolean;
  /** Unlinked rule node — show setup warning on canvas. */
  showRuleSetupWarning?: boolean;
  /**
   * Groups only: how many slot markers to render (members **plus** the trailing empty one).
   *
   * Supplied by the canvas so the card and the drop maths read the same number; deriving it a second
   * time inside the card is how the markers and the drops came to disagree.
   */
  groupSlotCount?: number;
  /** Groups only: number of members, which is what the collapse toggle should report. */
  groupMemberCount?: number;
}

/** Payload on Vue Flow edges — mirrors `LabWorkflowGraphEdgeV2` for round-trips. */
export interface LabWorkflowFlowEdgeData {
  domainEdge: LabWorkflowGraphEdgeV2;
}

export type LabWorkflowFlowNodeKind = LabWorkflowGraphNodeV2['kind'];

/** Vue Flow reserves `group` for parent sizing; use a custom type so containers stay draggable. */
export const LAB_WORKFLOW_GROUP_VUE_NODE_TYPE = 'wfGroup';

export function labWorkflowDesignerKindFromVueFlowType(
  type: string | undefined,
): LabWorkflowFlowNodeKind {
  if (type === LAB_WORKFLOW_GROUP_VUE_NODE_TYPE) {
    return 'group';
  }
  return (type ?? 'action') as LabWorkflowFlowNodeKind;
}

export function labWorkflowVueFlowTypeForDesignerKind(kind: LabWorkflowFlowNodeKind): string {
  return kind === 'group' ? LAB_WORKFLOW_GROUP_VUE_NODE_TYPE : kind;
}

/**
 * Minimal node shape we own in the designer (not Vue Flow's `GraphNode`).
 * Avoids vue-tsc "excessively deep" instantiation when mapping domain ↔ canvas.
 */
export interface LabWorkflowFlowNode {
  id: string;
  type: LabWorkflowFlowNodeKind;
  position: LabWorkflowGraphPosition;
  data: LabWorkflowFlowNodeData;
  parentNode?: string;
  extent?: 'parent';
  style?: { width?: string; height?: string };
  zIndex?: number;
  /** Rendered but not drawn — used to hide a collapsed group's members without moving them. */
  hidden?: boolean;
}

export const DEFAULT_GROUP_WIDTH = 320;
export const DEFAULT_GROUP_HEIGHT = 200;

/** Approximate canvas card size for palette drop centering (standard nodes). */
export const LAB_WORKFLOW_NODE_DROP_WIDTH = 176;
export const LAB_WORKFLOW_NODE_DROP_HEIGHT = 76;

function parseCssSize(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export interface LabWorkflowFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  animated?: boolean;
  data: LabWorkflowFlowEdgeData;
}

export function getLabWorkflowFlowEdgeDomain(edge: LabWorkflowFlowEdge): LabWorkflowGraphEdgeV2 | undefined {
  return edge.data.domainEdge;
}

/** Map domain graph → designer state (also valid as Vue Flow `Node` at runtime). */
export function labWorkflowFlowNodeFromDomain(
  domainNode: LabWorkflowGraphNodeV2,
  data: LabWorkflowFlowNodeData,
): LabWorkflowFlowNode {
  const base: LabWorkflowFlowNode = {
    id: domainNode.id,
    type: domainNode.kind,
    position: { ...domainNode.position },
    data,
  };
  if (domainNode.kind === 'group') {
    const width = domainNode.width ?? DEFAULT_GROUP_WIDTH;
    const height = domainNode.height ?? DEFAULT_GROUP_HEIGHT;
    return {
      ...base,
      style: { width: `${width}px`, height: `${height}px` },
    };
  }
  if ((domainNode.kind === 'action' || domainNode.kind === 'rule') && domainNode.groupId) {
    /*
     * Deliberately **no** `extent: 'parent'`.
     *
     * `extent: 'parent'` clamps the child's position to the parent's box, so a member could never be
     * dragged onto the canvas to leave its group — Vue Flow pinned it at the boundary and it appeared
     * stuck. Containment is enforced on drop instead (`onNodeDragStop` in the canvas), which is also
     * the only place that can tell "moved to another slot" from "dropped outside the group".
     */
    return {
      ...base,
      parentNode: domainNode.groupId,
    };
  }
  return base;
}

export function labWorkflowFlowEdgeFromDomain(
  edge: LabWorkflowGraphEdgeV2,
  label: string | undefined,
  animated = false,
  sourceNode?: LabWorkflowGraphNodeV2,
): LabWorkflowFlowEdge {
  const sourceHandle = sourceHandleForWorkflowEdge(sourceNode, edge);
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(sourceHandle ? { sourceHandle } : {}),
    label,
    animated,
    data: { domainEdge: edge },
  };
}

/** Single cast site for Vue Flow v-model (library types recurse; our state does not). */
export function labWorkflowFlowNodesToVueFlow(nodes: LabWorkflowFlowNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: labWorkflowVueFlowTypeForDesignerKind(node.type),
    position: node.position,
    data: node.data,
    draggable: true,
    selectable: true,
    /*
     * `extent` is forwarded only when the caller set it. Defaulting to `'parent'` here silently
     * re-clamped every group member to its group's box, so a member could never be dragged onto the
     * canvas to leave — the default undid the deliberate omission in `labWorkflowFlowNodeFromDomain`.
     * Containment is decided on drop instead (see `onNodeDragStop`).
     */
    ...(node.parentNode
      ? { parentNode: node.parentNode, ...(node.extent ? { extent: node.extent } : {}) }
      : {}),
    ...(node.style ? { style: node.style } : {}),
    // Must be forwarded explicitly: this mapper is allow-list based, so a field it does not name is
    // silently dropped — a collapsed group's hidden members would then still be painted.
    ...(node.hidden ? { hidden: true } : {}),
  })) as Node[];
}

/** Vue Flow edge label chrome — uses canvas CSS vars from `.lab-workflow-graph-canvas__flow`. */
const LAB_WORKFLOW_EDGE_LABEL_VUE_FLOW = {
  labelShowBg: true,
  labelBgPadding: [14, 5] as [number, number],
  labelBgBorderRadius: 6,
  labelBgStyle: {
    fill: 'var(--lab-workflow-edge-label-bg)',
    stroke: 'var(--lab-workflow-edge-label-border)',
    strokeWidth: 1.25,
  },
  labelStyle: {
    fill: 'var(--lab-general-text)',
    fontWeight: 600,
    fontSize: 10,
  },
} as const;

export function labWorkflowFlowEdgesToVueFlow(edges: LabWorkflowFlowEdge[]): Edge[] {
  return edges.map((edge) => {
    if (!edge.label) {
      return edge as Edge;
    }
    return {
      ...edge,
      ...LAB_WORKFLOW_EDGE_LABEL_VUE_FLOW,
    } as Edge;
  });
}

/**
 * Position to **persist** for a node.
 *
 * Vue Flow keeps a parented node's `position` **relative to its parent** and exposes the resolved
 * absolute point as `computedPosition` (`getXYZPos(parent.computedPosition, position)` in
 * `@vue-flow/core`). Reading `computedPosition` unconditionally therefore wrote **canvas**
 * coordinates into a field the renderer reads as **parent-relative**, so every round-trip shifted a
 * group member by the group's own offset:
 *
 * - the child rendered offset from its slot, sometimes outside the group's bounds entirely;
 * - the drift compounded on each save, because the already-shifted value was written again;
 * - and it looked like the child "would not stay in the group" rather than like a coordinate bug.
 *
 * The group's geometry is persisted by [`labWorkflowGraphNodeFromFlowState`](lab-workflow-graph-flow.ts:206)
 * on the group node itself, so a child only ever needs its offset.
 */
function positionFromVueFlowNode(
  node: Node,
  detachedFromParent: boolean,
): LabWorkflowGraphPosition {
  const graphNode = node as GraphNode;
  if (graphNode.parentNode && !detachedFromParent) {
    // Parented: `position` is already the offset we store. `computedPosition` would be absolute.
    return { x: graphNode.position.x, y: graphNode.position.y };
  }
  // Detached (or never parented): the resolved absolute point is what the canvas shows.
  const pos = graphNode.computedPosition ?? graphNode.position;
  return { x: pos.x, y: pos.y };
}

/**
 * Map Vue Flow nodes into designer nodes.
 *
 * `detachedIds` is the canvas's own record of members the author has dragged out. It is applied
 * **here**, before position is read, because a detached node must both lose `parentNode` and switch
 * to its absolute position — clearing the parent afterwards would leave the relative offset behind,
 * which is the same class of bug as the original absolute/relative mix-up.
 */
export function labWorkflowFlowNodesFromVueFlow(
  nodes: Node[],
  detachedIds?: ReadonlySet<string>,
): LabWorkflowFlowNode[] {
  return nodes.map((node) => {
    const detached = detachedIds?.has(node.id) === true;
    return {
      id: node.id,
      type: labWorkflowDesignerKindFromVueFlowType(node.type),
      position: positionFromVueFlowNode(node, detached),
      data: node.data as LabWorkflowFlowNodeData,
      parentNode: !detached && typeof node.parentNode === 'string' ? node.parentNode : undefined,
      extent: !detached && node.extent === 'parent' ? 'parent' : undefined,
      style: node.style as LabWorkflowFlowNode['style'],
      zIndex: typeof node.zIndex === 'number' ? node.zIndex : undefined,
    };
  });
}

/** Merge canvas geometry into a domain node after drag / resize. */
export function labWorkflowGraphNodeFromFlowState(
  domainNode: LabWorkflowGraphNodeV2,
  flowNode: LabWorkflowFlowNode | undefined,
): LabWorkflowGraphNodeV2 {
  if (!flowNode) {
    return domainNode;
  }
  const position = { x: flowNode.position.x, y: flowNode.position.y };
  if (domainNode.kind === 'action' || domainNode.kind === 'rule') {
    const groupId = flowNode.parentNode ?? undefined;
    return { ...domainNode, position, groupId };
  }
  if (domainNode.kind === 'group') {
    const width = parseCssSize(flowNode.style?.width, domainNode.width ?? DEFAULT_GROUP_WIDTH);
    const height = parseCssSize(flowNode.style?.height, domainNode.height ?? DEFAULT_GROUP_HEIGHT);
    return { ...domainNode, position, width, height };
  }
  return { ...domainNode, position };
}

export function labWorkflowFlowEdgesFromVueFlow(edges: Edge[]): LabWorkflowFlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: typeof edge.sourceHandle === 'string' ? edge.sourceHandle : undefined,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    animated: edge.animated,
    data: edge.data as LabWorkflowFlowEdgeData,
  }));
}
