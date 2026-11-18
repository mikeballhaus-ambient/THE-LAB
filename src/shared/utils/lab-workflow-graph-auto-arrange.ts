import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import {
  DEFAULT_GROUP_HEIGHT,
  DEFAULT_GROUP_WIDTH,
  LAB_WORKFLOW_NODE_DROP_HEIGHT,
  LAB_WORKFLOW_NODE_DROP_WIDTH,
} from '@/shared/types/lab-workflow-graph-flow';

export interface LabWorkflowGraphAutoArrangeOptions {
  direction?: 'LR' | 'TB';
  nodeWidth?: number;
  nodeHeight?: number;
  layerGap?: number;
  siblingGap?: number;
  canvasMargin?: number;
  groupPadding?: number;
  groupHeader?: number;
}

/**
 * Default auto-arrange runs **top-to-bottom**.
 *
 * The editor's canvas column is wide but short (the sidebar and palette take the flanks, and the
 * viewport is the limiting dimension), so a left-to-right chain runs off the right edge almost
 * immediately and has to be panned. Stacking layers vertically uses the available height.
 */
const DEFAULT_OPTIONS: Required<LabWorkflowGraphAutoArrangeOptions> = {
  direction: 'TB',
  nodeWidth: LAB_WORKFLOW_NODE_DROP_WIDTH,
  nodeHeight: LAB_WORKFLOW_NODE_DROP_HEIGHT,
  layerGap: 64,
  siblingGap: 44,
  canvasMargin: 48,
  groupPadding: 28,
  groupHeader: 44,
};

function isGroupChild(node: LabWorkflowGraphNodeV2): boolean {
  return (node.kind === 'action' || node.kind === 'rule') && Boolean(node.groupId);
}

/** Top-level canvas nodes (not nested inside a group). */
function isTopLevelLayoutNode(node: LabWorkflowGraphNodeV2): boolean {
  return !isGroupChild(node);
}

function layoutAnchorId(nodeId: string, nodeById: Map<string, LabWorkflowGraphNodeV2>): string {
  const node = nodeById.get(nodeId);
  if (!node) {
    return nodeId;
  }
  if ((node.kind === 'action' || node.kind === 'rule') && node.groupId) {
    return node.groupId;
  }
  return nodeId;
}

function groupSize(node: LabWorkflowGraphNodeV2 & { kind: 'group' }): { width: number; height: number } {
  return {
    width: node.width ?? DEFAULT_GROUP_WIDTH,
    height: node.height ?? DEFAULT_GROUP_HEIGHT,
  };
}

function nodeFootprint(
  node: LabWorkflowGraphNodeV2,
  opts: Required<LabWorkflowGraphAutoArrangeOptions>,
): { width: number; height: number } {
  if (node.kind === 'group') {
    const size = groupSize(node);
    return { width: size.width, height: size.height };
  }
  return { width: opts.nodeWidth, height: opts.nodeHeight };
}

/** Span along the secondary axis within one layer (siblings). */
function layerSecondarySpan(
  ids: string[],
  nodeById: Map<string, LabWorkflowGraphNodeV2>,
  opts: Required<LabWorkflowGraphAutoArrangeOptions>,
  direction: 'LR' | 'TB',
): number {
  if (ids.length === 0) {
    return 0;
  }
  if (direction === 'LR') {
    let stack = 0;
    for (const id of ids) {
      const node = nodeById.get(id);
      if (!node) {
        continue;
      }
      stack += nodeFootprint(node, opts).height;
    }
    return stack + Math.max(0, ids.length - 1) * opts.siblingGap;
  }
  let span = 0;
  for (const id of ids) {
    const node = nodeById.get(id);
    if (!node) {
      continue;
    }
    span += nodeFootprint(node, opts).width;
  }
  return span + Math.max(0, ids.length - 1) * opts.siblingGap;
}

/** Extent along the primary axis (layer-to-layer advance) for one layer. */
function layerPrimaryExtent(
  ids: string[],
  nodeById: Map<string, LabWorkflowGraphNodeV2>,
  opts: Required<LabWorkflowGraphAutoArrangeOptions>,
  direction: 'LR' | 'TB',
): number {
  let max = direction === 'LR' ? opts.nodeWidth : opts.nodeHeight;
  for (const id of ids) {
    const node = nodeById.get(id);
    if (!node) {
      continue;
    }
    const footprint = nodeFootprint(node, opts);
    max = Math.max(max, direction === 'LR' ? footprint.width : footprint.height);
  }
  return max;
}

function assignLayers(
  layoutNodeIds: string[],
  edges: LabWorkflowGraphEdgeV2[],
  nodeById: Map<string, LabWorkflowGraphNodeV2>,
): Map<string, number> {
  const layoutSet = new Set(layoutNodeIds);
  const layer = new Map<string, number>();

  for (const id of layoutNodeIds) {
    const node = nodeById.get(id);
    if (node?.kind === 'trigger') {
      layer.set(id, 0);
    }
  }

  const layoutEdges: { source: string; target: string }[] = [];
  for (const edge of edges) {
    const source = layoutAnchorId(edge.source, nodeById);
    const target = layoutAnchorId(edge.target, nodeById);
    if (!layoutSet.has(source) || !layoutSet.has(target) || source === target) {
      continue;
    }
    layoutEdges.push({ source, target });
  }

  const incomingCount = new Map<string, number>();
  for (const id of layoutNodeIds) {
    incomingCount.set(id, 0);
  }
  for (const { target } of layoutEdges) {
    incomingCount.set(target, (incomingCount.get(target) ?? 0) + 1);
  }

  for (const id of layoutNodeIds) {
    if (!layer.has(id) && (incomingCount.get(id) ?? 0) === 0) {
      layer.set(id, 0);
    }
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < layoutNodeIds.length + 8) {
    changed = false;
    guard += 1;
    for (const { source, target } of layoutEdges) {
      const sourceLayer = layer.get(source);
      if (sourceLayer === undefined) {
        continue;
      }
      const next = sourceLayer + 1;
      const current = layer.get(target);
      if (current === undefined || next > current) {
        layer.set(target, next);
        changed = true;
      }
    }
  }

  let maxLayer = 0;
  for (const id of layoutNodeIds) {
    if (!layer.has(id)) {
      layer.set(id, 0);
    }
    maxLayer = Math.max(maxLayer, layer.get(id) ?? 0);
  }

  const disconnected = layoutNodeIds.filter(
    (id) =>
      nodeById.get(id)?.kind !== 'trigger' &&
      !layoutEdges.some((e) => e.source === id || e.target === id),
  );
  if (disconnected.length > 0) {
    const orphanLayer = maxLayer + 1;
    for (const id of disconnected) {
      layer.set(id, orphanLayer);
    }
  }

  return layer;
}

function placeTopLevelNodes(
  nodes: LabWorkflowGraphNodeV2[],
  edges: LabWorkflowGraphEdgeV2[],
  opts: Required<LabWorkflowGraphAutoArrangeOptions>,
): Map<string, { x: number; y: number }> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const layoutIds = nodes.filter(isTopLevelLayoutNode).map((n) => n.id);
  const layers = assignLayers(layoutIds, edges, nodeById);

  const byLayer = new Map<number, string[]>();
  for (const id of layoutIds) {
    const layerIndex = layers.get(id) ?? 0;
    const list = byLayer.get(layerIndex) ?? [];
    list.push(id);
    byLayer.set(layerIndex, list);
  }

  const sortedLayerKeys = [...byLayer.keys()].sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();

  const maxSecondarySpan = sortedLayerKeys.reduce((max, layerKey) => {
    const ids = (byLayer.get(layerKey) ?? []).sort((a, b) => a.localeCompare(b));
    return Math.max(max, layerSecondarySpan(ids, nodeById, opts, opts.direction));
  }, 0);

  let primaryOffset = opts.canvasMargin;
  for (const layerKey of sortedLayerKeys) {
    const ids = (byLayer.get(layerKey) ?? []).sort((a, b) => a.localeCompare(b));
    const secondarySpan = layerSecondarySpan(ids, nodeById, opts, opts.direction);
    const secondaryOffset = opts.canvasMargin + (maxSecondarySpan - secondarySpan) / 2;

    let runningSecondary = secondaryOffset;
    for (const id of ids) {
      const node = nodeById.get(id);
      if (!node) {
        continue;
      }
      const { width, height } = nodeFootprint(node, opts);
      if (opts.direction === 'LR') {
        positions.set(id, { x: primaryOffset, y: runningSecondary });
        runningSecondary += height + opts.siblingGap;
      } else {
        positions.set(id, { x: runningSecondary, y: primaryOffset });
        runningSecondary += width + opts.siblingGap;
      }
    }

    primaryOffset +=
      layerPrimaryExtent(ids, nodeById, opts, opts.direction) + opts.layerGap;
  }

  return positions;
}

function arrangeGroupChildren(
  nodes: LabWorkflowGraphNodeV2[],
  opts: Required<LabWorkflowGraphAutoArrangeOptions>,
): LabWorkflowGraphNodeV2[] {
  const groups = nodes.filter((n): n is LabWorkflowGraphNodeV2 & { kind: 'group' } => n.kind === 'group');
  if (groups.length === 0) {
    return nodes;
  }

  const updates = new Map<string, LabWorkflowGraphNodeV2>();

  for (const group of groups) {
    const children = nodes.filter(
      (n) => (n.kind === 'action' || n.kind === 'rule') && n.groupId === group.id,
    );
    if (children.length === 0) {
      continue;
    }
    const sorted = [...children].sort((a, b) => {
      const dy = a.position.y - b.position.y;
      if (Math.abs(dy) > 0.5) {
        return dy;
      }
      return a.id.localeCompare(b.id);
    });
    let y = opts.groupHeader;
    let maxChildWidth = opts.nodeWidth;
    for (const child of sorted) {
      const position = { x: opts.groupPadding, y };
      updates.set(child.id, { ...child, position });
      y += opts.nodeHeight + opts.siblingGap;
      maxChildWidth = Math.max(maxChildWidth, opts.nodeWidth);
    }
    const contentHeight = y - opts.siblingGap + opts.groupPadding;
    const contentWidth = maxChildWidth + opts.groupPadding * 2;
    const nextGroup: LabWorkflowGraphNodeV2 = {
      ...group,
      width: Math.max(contentWidth, DEFAULT_GROUP_WIDTH),
      height: Math.max(contentHeight, DEFAULT_GROUP_HEIGHT),
    };
    updates.set(group.id, nextGroup);
  }

  return nodes.map((node) => updates.get(node.id) ?? node);
}

/**
 * Assigns canvas positions for workflow graph nodes (top-level layered layout + group interiors).
 */
export function autoArrangeLabWorkflowGraph(
  def: Pick<LabWorkflowDefinitionV2, 'nodes' | 'edges'>,
  options?: LabWorkflowGraphAutoArrangeOptions,
): LabWorkflowGraphNodeV2[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const topPositions = placeTopLevelNodes(def.nodes, def.edges, opts);
  let nodes = def.nodes.map((node) => {
    if (!isTopLevelLayoutNode(node)) {
      return node;
    }
    const pos = topPositions.get(node.id);
    if (!pos) {
      return node;
    }
    return { ...node, position: pos };
  });
  nodes = arrangeGroupChildren(nodes, opts);
  return nodes;
}
