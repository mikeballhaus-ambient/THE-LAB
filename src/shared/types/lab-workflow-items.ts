/**
 * The workflow data contract: nodes transform **arrays of items**.
 *
 * ## Why an item array rather than a single payload
 *
 * A workflow node that can only receive one payload object cannot loop, cannot merge two branches,
 * and cannot pass a result to the next node. n8n models this as `items: Array<{ json }>` — that is
 * why its `Loop Over Items`, `Merge` and `Split Out` nodes exist at all, and why `$("Node").all()`
 * takes a branch index.
 *
 * THE-LAB adopted the same shape on 2026-10-19. A single-payload event is simply wrapped as
 * `{ items: [{ json: payload }] }`, so the degenerate case is a one-element array and every node has
 * exactly one contract to implement.
 *
 * ## Resolution semantics
 *
 * A `path` (e.g. `assigneeId`, `invoice.total`) resolves against **one item's `json`**, not against
 * the whole output. That keeps the meaning identical to the pre-array behaviour while allowing a
 * node to be applied per-item.
 */

export interface LabWorkflowItem {
  /** The record this item represents. Nodes read and write here. */
  json: Record<string, unknown>;
  /**
   * Provenance. Survives a chain so a node can correlate an output back to the input item that
   * produced it — needed by `Merge` (join by index), and by error reporting ("item 3 of node X").
   */
  pairedItem?: { nodeId: string; itemIndex: number };
}

/**
 * What a node emits.
 *
 * `branch` is only set by routing nodes (`IF`, `Switch`) so the evaluator knows which outgoing
 * edges to take. A node that does not branch leaves it undefined, meaning "single implicit output".
 *
 * `outputIndex` is the *port* the items came out of. It is separate from `branch` because a Switch
 * has one port per rule plus a fallback, while an IF has exactly two — and because an edge authored
 * before routing existed has no index at all and must still be taken after a non-routing node.
 */
export interface LabWorkflowNodeOutput {
  items: LabWorkflowItem[];
  /** Named port for two-way routings: IF (`true`/`false`) and loop (`body`/`done`). */
  branch?: 'true' | 'false' | 'body' | 'done' | number;
  /** Port this output leaves from. `undefined` = the node's single implicit output. */
  outputIndex?: number;
  /**
   * Rows emitted on **each** port, for a node that can feed several branches at once.
   *
   * `items` alone cannot express this: an IF over a mixed batch has rows for both ports, and picking
   * one of them made "split the batch, transform each half, merge it back" impossible — the half on
   * the other port was silently discarded. `outputIndex` still names the primary port (so
   * `itemsOutCount` and every pre-existing caller keep a single, meaningful answer); this map is what
   * lets the walker hand each edge the rows that actually belong to it.
   *
   * A port absent from the map emitted nothing, which is an empty array downstream, not "use
   * another port's rows".
   */
  branches?: Record<number, LabWorkflowItem[]>;
}

/** Wrap a single payload as a one-item output — the degenerate case used by triggers. */
export function singleItemOutput(
  payload: Record<string, unknown>,
  nodeId?: string,
): LabWorkflowNodeOutput {
  const item: LabWorkflowItem = { json: payload };
  if (nodeId) {
    item.pairedItem = { nodeId, itemIndex: 0 };
  }
  return { items: [item] };
}

/** Empty output — a node that filtered everything out, or a trigger with no items. */
export function emptyOutput(): LabWorkflowNodeOutput {
  return { items: [] };
}

/**
 * Pass items through unchanged, re-stamping provenance to `nodeId`.
 *
 * Used by nodes that observe but do not transform (notify, publish, DM): they act on an item and
 * hand the same item to the next node, so a chain of side-effecting nodes still resolves `paths`
 * against the original payload.
 */
export function passThroughItems(
  items: readonly LabWorkflowItem[],
  nodeId: string,
): LabWorkflowNodeOutput {
  return {
    items: items.map((item, itemIndex) => ({
      json: item.json,
      pairedItem: { nodeId, itemIndex },
    })),
  };
}
