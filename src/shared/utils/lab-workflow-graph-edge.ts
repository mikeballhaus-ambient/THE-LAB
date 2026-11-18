import type {
  LabWorkflowEdgeWhen,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { labWorkflowNodeHasBranchOutputs } from '@/shared/utils/lab-workflow-graph-branch-handles';

export interface LabWorkflowEdgeTraverseContext {
  ruleMatch?: boolean;
  conditionPass?: boolean;
  /**
   * Port the source node emitted (W7). `undefined` means the node has one implicit output.
   *
   * This is what makes a Switch addressable: an edge carrying `outputIndex: 2` is taken only when
   * the node emitted port 2, so the unmatched branch is a real route rather than dead code.
   */
  outputIndex?: number;
}

export function edgeWhenAllows(when: LabWorkflowEdgeWhen, ctx: LabWorkflowEdgeTraverseContext): boolean {
  switch (when) {
    case 'always':
      return true;
    case 'on_match':
      return ctx.ruleMatch === true;
    case 'on_no_match':
      return ctx.ruleMatch === false;
    case 'on_true':
      return ctx.conditionPass === true;
    case 'on_false':
      return ctx.conditionPass === false;
    default:
      return false;
  }
}

/**
 * Whether an edge leaves the port the node actually emitted.
 *
 * The asymmetry is deliberate:
 *
 * - An edge **with** an index is taken only on that port.
 * - An edge **without** an index is taken whenever the node has no port to speak of, so every
 *   pre-W7 graph keeps working. On a routing node it is *not* taken, because "no port specified" on
 *   a branching node is ambiguous, and silently taking it on every branch would run the downstream
 *   node once per port — the exact bug the handoff warns about.
 */
export function edgeOutputAllows(
  edge: LabWorkflowGraphEdgeV2,
  ctx: LabWorkflowEdgeTraverseContext,
): boolean {
  const edgePort =
    edge.outputIndex === undefined || edge.outputIndex === null
      ? undefined
      : Number(edge.outputIndex);
  const ctxPort =
    ctx.outputIndex === undefined || ctx.outputIndex === null
      ? undefined
      : Number(ctx.outputIndex);
  if (edgePort != null && Number.isFinite(edgePort)) {
    return ctxPort === edgePort;
  }
  return ctxPort == null;
}

export function outgoingEdges(
  edges: LabWorkflowGraphEdgeV2[],
  sourceNodeId: string,
  ctx: LabWorkflowEdgeTraverseContext,
): LabWorkflowGraphEdgeV2[] {
  return edges.filter(
    (edge) =>
      edge.source === sourceNodeId
      && edgeWhenAllows(edge.when, ctx)
      && edgeOutputAllows(edge, ctx),
  );
}

export const LAB_WORKFLOW_EDGE_WHEN_OPTIONS: { label: string; value: LabWorkflowEdgeWhen }[] = [
  { label: 'Always', value: 'always' },
  { label: 'When rule matches', value: 'on_match' },
  { label: 'When rule does not match', value: 'on_no_match' },
  { label: 'When condition is true', value: 'on_true' },
  { label: 'When condition is false', value: 'on_false' },
];

/**
 * Collapse edges that describe the **same route**.
 *
 * ## Why this has to exist
 *
 * Canvas editors key edges by `id` (Vue Flow renders one line per id), but the graph walker iterates
 * the array. So two entries sharing an id are one visible connector and two stored edges: the details
 * panel lists the branch twice, the canvas shows it once, and clicking the line can only ever address
 * one of them. The extra entry is unreachable by the UI — there is no handle to grab and no row to
 * select — and no way for a user to clear it.
 *
 * Dedupe is applied on **read** (so a graph already stored with duplicates renders honestly) and on
 * **write** (so the next save heals the row). Identity is the id; the semantic route
 * (`source`/`target`/`when`/`outputIndex`) is a second pass, because two ids pointing at the same
 * branch are equally unreachable once one of them is hidden behind the other.
 *
 * Branching edges are **not** collapsed wrongly: `when` and `outputIndex` are part of the semantic
 * key, so the true and false branches of one IF stay separate.
 */
export interface LabWorkflowEdgeDedupeResult {
  edges: LabWorkflowGraphEdgeV2[];
  /** Edge ids that were dropped (a superset entry means "was not the first one kept"). */
  removedIds: string[];
}

export function dedupeLabWorkflowGraphEdges(
  edges: readonly LabWorkflowGraphEdgeV2[],
): LabWorkflowEdgeDedupeResult {
  const keptIds = new Set<string>();
  const keptRoutes = new Set<string>();
  const unique: LabWorkflowGraphEdgeV2[] = [];
  const removedIds: string[] = [];

  for (const edge of edges) {
    if (keptIds.has(edge.id)) {
      removedIds.push(edge.id);
      continue;
    }
    const route = `${edge.source}\u0000${edge.target}\u0000${edge.when}\u0000${edge.outputIndex ?? ''}`;
    if (keptRoutes.has(route)) {
      removedIds.push(edge.id);
      continue;
    }
    keptIds.add(edge.id);
    keptRoutes.add(route);
    unique.push(edge);
  }

  return { edges: unique, removedIds };
}

/** True when the list contains a duplicate id or a repeated route. */
export function labWorkflowGraphEdgesHaveDuplicates(
  edges: readonly LabWorkflowGraphEdgeV2[],
): boolean {
  return dedupeLabWorkflowGraphEdges(edges).removedIds.length > 0;
}

/** Copy of `edge` with the port removed — "no port" is a real state, not a missing value. */
function withoutEdgePort(edge: LabWorkflowGraphEdgeV2): LabWorkflowGraphEdgeV2 {
  const next = { ...edge };
  delete next.outputIndex;
  return next;
}

/**
 * Keep `when` and `outputIndex` expressing **one** branch for port-branching sources.
 *
 * ## Why this is needed
 *
 * An IF action exposes two ports, and which branch an edge belongs to is encoded **twice**: as `when`
 * (`on_true` / `on_false`) and as `outputIndex` (0 / 1). The canvas renders the line from the handle,
 * and `sourceHandleForWorkflowEdge` resolves the handle from `outputIndex` **first**. So when an author
 * flips "Run this branch when" in the details panel, the stale index wins and the edge snaps back to
 * the port it was drawn on: the edit appears to save and then silently reverts.
 *
 * Normalising at the **write funnel** rather than inside the panel means every path (panel edit, drag,
 * MCP call, import) lands on the same encoding, and the author's explicit choice is the input while
 * the port is derived from it.
 *
 * - `condition` / `rule` sources: the branch is carried by `when` alone, so any port index is dropped.
 * - `if_condition` action: `when` is authoritative — `on_true` = port 0, `on_false` = port 1 — and
 *   `always` clears the index, because an "always" edge is not branch-gated.
 * - `loop` action: `when` is always `always` and the **port decides** (`body` / `done`), so the index
 *   is deliberately left alone. Clearing it would collapse both exits of the loop into one route.
 */
export function normalizeLabWorkflowEdgeBranch(
  source: LabWorkflowGraphNodeV2 | undefined,
  edge: LabWorkflowGraphEdgeV2,
): LabWorkflowGraphEdgeV2 {
  if (!source) {
    return edge;
  }
  if (source.kind === 'condition' || source.kind === 'rule') {
    if (edge.outputIndex === undefined || edge.outputIndex === null) {
      return edge;
    }
    return withoutEdgePort(edge);
  }
  if (source.kind === 'action' && source.step.kind === 'if_condition') {
    if (edge.when === 'on_true') {
      return edge.outputIndex === 0 ? edge : { ...edge, outputIndex: 0 };
    }
    if (edge.when === 'on_false') {
      return edge.outputIndex === 1 ? edge : { ...edge, outputIndex: 1 };
    }
    if (edge.when === 'always') {
      if (edge.outputIndex === undefined || edge.outputIndex === null) {
        return edge;
      }
      return withoutEdgePort(edge);
    }
  }
  return edge;
}

/** Business-readable label for an outgoing link in the details panel (not raw port numbers). */
export function labWorkflowOutgoingBranchLabel(
  source: LabWorkflowGraphNodeV2,
  edge: Pick<LabWorkflowGraphEdgeV2, 'when' | 'outputIndex'>,
): string {
  if (source.kind === 'action' && source.step.kind === 'if_condition') {
    if (edge.outputIndex === 0 || edge.when === 'on_true') {
      return 'True branch';
    }
    if (edge.outputIndex === 1 || edge.when === 'on_false') {
      return 'False branch';
    }
    return 'Outgoing branch';
  }
  // A loop routes by **port**, not by `when` (both exits are `always`). Without this branch the
  // details panel falls through to the generic `when` list and reports a loop's Done edge as
  // "Always" or, worse, borrows the IF wording — the branch names on the node and the sidebar then
  // disagree about the same connection.
  if (source.kind === 'action' && source.step.kind === 'loop') {
    if (edge.outputIndex === 0) {
      return 'While branch';
    }
    if (edge.outputIndex === 1) {
      return 'Done branch';
    }
    return 'Loop branch';
  }
  if (source.kind === 'condition') {
    if (edge.when === 'on_true') {
      return 'When condition is true';
    }
    if (edge.when === 'on_false') {
      return 'When condition is false';
    }
  }
  if (source.kind === 'rule') {
    if (edge.when === 'on_match') {
      return 'When rule matches';
    }
    if (edge.when === 'on_no_match') {
      return 'When rule does not match';
    }
  }
  const option = LAB_WORKFLOW_EDGE_WHEN_OPTIONS.find((row) => row.value === edge.when);
  return option?.label ?? String(edge.when);
}

/**
 * True/false labels for every edge leaving an IF action, including legacy links that lack
 * `outputIndex` after a canvas round-trip.
 */
function edgeWhenShortLabel(when: LabWorkflowEdgeWhen): string {
  switch (when) {
    case 'on_true':
      return 'true';
    case 'on_false':
      return 'false';
    case 'on_match':
      return 'match';
    case 'on_no_match':
      return 'no match';
    default:
      return '';
  }
}

/**
 * Text on the canvas edge line. Branching nodes use dedicated ports, so omit auto "true"/"false" tags
 * unless the author set an explicit `label`.
 */
export function labWorkflowCanvasEdgeLabel(
  edge: Pick<LabWorkflowGraphEdgeV2, 'when' | 'label'>,
  sourceNode?: LabWorkflowGraphNodeV2,
): string | undefined {
  const explicit = edge.label?.trim();
  if (explicit) {
    return explicit;
  }
  if (sourceNode && labWorkflowNodeHasBranchOutputs(sourceNode)) {
    return undefined;
  }
  const text = edgeWhenShortLabel(edge.when).trim();
  return text.length > 0 ? text : undefined;
}

export function resolveIfOutgoingBranchLabels(
  source: LabWorkflowGraphNodeV2,
  edges: LabWorkflowGraphEdgeV2[],
): Map<string, string> {
  const labels = new Map<string, string>();
  if (source.kind !== 'action' || source.step.kind !== 'if_condition') {
    return labels;
  }
  const outgoing = edges.filter((edge) => edge.source === source.id);
  for (const edge of outgoing) {
    const direct = labWorkflowOutgoingBranchLabel(source, edge);
    if (direct !== 'Outgoing branch') {
      labels.set(edge.id, direct);
    }
  }
  const unassigned = outgoing
    .filter((edge) => !labels.has(edge.id))
    .sort((a, b) => {
      const rank = (index: number | undefined): number => {
        if (index === 0) {
          return 0;
        }
        if (index === 1) {
          return 1;
        }
        return 2;
      };
      const byPort = rank(a.outputIndex) - rank(b.outputIndex);
      return byPort !== 0 ? byPort : a.id.localeCompare(b.id);
    });
  let hasTrue = outgoing.some((edge) => labels.get(edge.id) === 'True branch');
  let hasFalse = outgoing.some((edge) => labels.get(edge.id) === 'False branch');
  for (const edge of unassigned) {
    if (!hasTrue) {
      labels.set(edge.id, 'True branch');
      hasTrue = true;
    } else if (!hasFalse) {
      labels.set(edge.id, 'False branch');
      hasFalse = true;
    } else {
      labels.set(edge.id, 'Outgoing branch');
    }
  }
  return labels;
}
