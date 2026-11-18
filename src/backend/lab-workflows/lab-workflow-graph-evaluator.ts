import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { emitWorkflowRunStep } from './lab-workflow-run-stream';
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabWorkflowScope } from '@/shared/types/lab-workflow';
import { LAB_WORKFLOW_RUN_JSON_MAX_BYTES } from '@/shared/types/lab-workflow-run';
import {
  singleItemOutput,
  type LabWorkflowItem,
} from '@/shared/types/lab-workflow-items';
import { workflowConditionsMatch } from './lab-workflow-integration-runtime';
import { workflowGraphRuleNodeMatches } from './lab-workflow-graph-rule-runtime';
import { outgoingEdges } from '@/shared/utils/lab-workflow-graph-edge';
import type { EvaluateWorkflowsOptions } from './lab-workflows-evaluator';
import { runWorkflowStep } from './lab-workflow-step-runner';
import { classifyStepStatus } from './lab-workflow-run-recorder';
import {
  evaluateRuleGroupMembers,
  executeActionGroupMembers,
  isGroupMemberNode,
} from './lab-workflow-graph-group-runtime';
import { normalizeWorkflowGroupNode } from '@/shared/utils/lab-workflow-graph-group-normalize';
import { labWorkflowGraphGroupMemberNodes } from '@/shared/utils/lab-workflow-graph-group';

/**
 * How much of an over-budget payload survives as a preview.
 *
 * 600 characters is enough for a recognisable shape (the field names and a couple of values) without
 * undoing the point of the cap. Kept next to the helper that uses it so the two cannot drift.
 */
const LAB_WORKFLOW_RUN_PAYLOAD_PREVIEW_CHARS = 600;

function summarizeRunPayload(payload: Record<string, unknown>): Record<string, string> {
  const lines: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === '') {
      lines[key] = '(empty)';
    } else if (typeof value === 'object') {
      lines[key] = JSON.stringify(value);
    } else {
      lines[key] = String(value);
    }
  }
  return lines;
}

type ActionNode = Extract<LabWorkflowGraphNodeV2, { kind: 'action' }>;

/**
 * State for the walker, gathered once per run.
 *
 * It exists because the walker now needs two facts that are properties of the *whole graph* rather
 * than of the current path: which edges point at a node (a merge's branch order), and which branches
 * have arrived so far (the convergence buffer).
 */
interface WalkerContext {
  nodesById: Map<string, LabWorkflowGraphNodeV2>;
  edges: LabWorkflowDefinitionV2['edges'];
  envelope: LabDomainEventEnvelopeV1;
  workflowName: string;
  workflowScope: LabWorkflowScope;
  ownerUserId: number | null;
  options: EvaluateWorkflowsOptions;
  /**
   * Incoming edges per target node, in authored array order.
   *
   * Array order rather than `position.y` or id order because it is the only ordering that is stable
   * across editor sessions and does not change when the user drags a node: a merge's branch order has
   * to be a fact about the graph, not about the layout.
   */
  incomingByTarget: Map<string, LabWorkflowGraphEdgeV2[]>;
  convergence: ConvergenceState;
  workflowId: string;
  /** Monotonic counter for streamed node transitions. */
  streamSeq: number;
  /**
   * Where a running loop collects the items that come back along its body's back-edge.
   *
   * ## Why this exists
   *
   * `walkNode` returns `void`: it forwards data down edges but reports nothing back to its caller.
   * That is fine for a straight walk, but a loop needs the **body's output** to seed its next pass —
   * otherwise the increment a body node performs is computed, written into a fresh item array, and
   * then discarded when `runLoopNode` resets `items` to the array it held before walking.
   *
   * The symptom is specific and misleading: the loop iterates the right number of times, every body
   * node reports success with `itemCountOut: 1`, and the value the body is supposed to accumulate
   * never changes. It looks like the transform node is broken; it is the wiring.
   *
   * Set by `runLoopNode` immediately before it walks the body, cleared after. Intercepting at the
   * back-edge (rather than returning items from every recursive call) keeps the change inside the
   * loop: no other caller's contract moves.
   */
  loopBodySink: { loopId: string; items: readonly LabWorkflowItem[] } | null;
}

/**
 * Per-run convergence buffer (W7b).
 *
 * A depth-first walk carries one item array down one path, so when two branches meet at a node the
 * second arrival has no memory of the first. Correctness for a merge therefore needs memory outside
 * the recursion: each arrival is parked here, and the merge runs once, afterwards, with every branch
 * it could reach.
 */
interface ConvergenceState {
  /** `nodeId` → `edgeId` → the items that arrived on that edge. */
  arrivals: Map<string, Map<string, readonly LabWorkflowItem[]>>;
  /** Nodes already executed by the flush pass. Guards against a repeated flush. */
  flushed: Set<string>;
}

/**
 * A node that consumes **several branches at once**.
 *
 * Buffering is deliberately limited to this shape rather than applied to "any node with more than
 * one incoming edge": a rule or condition node takes a single item array and has no defined meaning
 * for three of them, so buffering it would only change *when* it runs, not what it does — and it
 * would change the behaviour of graphs that already work.
 */
function isConvergenceNode(node: LabWorkflowGraphNodeV2): boolean {
  // Deliberately **not** a `node is ActionNode` predicate: a false result would narrow the caller's
  // `node` to exclude every action, leaving only the trigger in the union — and the ordinary action
  // branch below would then be unreachable to the compiler.
  return node.kind === 'action' && node.step.kind === 'merge_items';
}

/**
 * Threading rule for the whole walker: **`items` is the data that reaches a node, and a node's
 * output items are what reaches its outgoing edges.**
 *
 * Before this, every node was handed the raw trigger payload and its output was discarded, so a
 * value written by one node could never be read by the next. That was invisible while the only
 * stored workflow had one action node; it makes every transform node (Set, Filter, Merge) inert.
 *
 * Trigger seeds the array; decision nodes (rule, condition, rule group) pass it through unchanged,
 * because they observe rather than transform — a condition between two data nodes must not silently
 * reset the data back to the envelope payload.
 */
/**
 * Items in / items out for one step, size-capped.
 *
 * ## Why this is captured per step
 *
 * When a graph misbehaves, the first two questions are always "what did this node receive?" and
 * "what did it produce?". Without them the author is left adding temporary logging to a code node to
 * find out — and every node downstream then has the same question. Recording both on the step makes
 * the run history self-explanatory.
 *
 * ## Budget
 *
 * A step row is written for every executed node of every run, and runs are retained 200 deep per
 * workflow, so this column cannot grow without bound. Each payload is serialised and, if it exceeds
 * `LAB_WORKFLOW_RUN_JSON_MAX_BYTES`, replaced by a marker plus a **preview** of the leading
 * characters — enough to recognise the shape, never enough to bloat the table. The counts are
 * recorded unconditionally so a truncated payload still reports how many items there were.
 */
function captureRunIo(
  itemsIn: readonly LabWorkflowItem[],
  itemsOut: readonly LabWorkflowItem[],
): Record<string, unknown> {
  return {
    input: capRunPayload(itemsIn.map((item) => item.json)),
    output: capRunPayload(itemsOut.map((item) => item.json)),
  };
}

function capRunPayload(value: unknown): unknown {
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    // A cyclic or otherwise unserialisable payload must not lose the whole step row.
    return { truncated: true, reason: 'not_serialisable' };
  }
  if (json == null) {
    return null;
  }
  // `Buffer` counts UTF-8 bytes, which is what the column budget is expressed in.
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes <= LAB_WORKFLOW_RUN_JSON_MAX_BYTES) {
    return value;
  }
  return {
    truncated: true,
    bytes,
    limitBytes: LAB_WORKFLOW_RUN_JSON_MAX_BYTES,
    preview: json.slice(0, LAB_WORKFLOW_RUN_PAYLOAD_PREVIEW_CHARS),
  };
}

/**
 * Narrate a node to the author's canvas.
 *
 * `seq` is assigned here rather than downstream because delivery order over one socket is not a
 * guarantee the canvas can rely on: a `running` for node N+1 must never be overwritten by a late
 * `running` for N.
 */
function streamNode(
  ctx: WalkerContext,
  nodeId: string,
  nodeKind: string,
  status: 'running' | 'succeeded' | 'failed' | 'skipped',
): void {
  if (!ctx.options.streamUserId) {
    return;
  }
  ctx.streamSeq += 1;
  emitWorkflowRunStep(ctx.options.io, ctx.options.streamUserId, {
    runId: ctx.options.run?.id ?? null,
    workflowId: ctx.workflowId,
    nodeId,
    nodeKind,
    status,
    seq: ctx.streamSeq,
  });
}

export async function evaluateWorkflowGraphForDomainEvent(
  definition: LabWorkflowDefinitionV2,
  envelope: LabDomainEventEnvelopeV1,
  workflowName: string,
  workflowScope: LabWorkflowScope,
  ownerUserId: number | null,
  options: EvaluateWorkflowsOptions,
): Promise<void> {
  const trigger = definition.nodes.find((n) => n.kind === 'trigger');
  if (!trigger || trigger.kind !== 'trigger') {
    return;
  }
  const seedItems = singleItemOutput(envelope.payload, trigger.id).items;

  const incomingByTarget = new Map<string, LabWorkflowGraphEdgeV2[]>();
  for (const edge of definition.edges) {
    const list = incomingByTarget.get(edge.target) ?? [];
    list.push(edge);
    incomingByTarget.set(edge.target, list);
  }

  const ctx: WalkerContext = {
    nodesById: new Map(definition.nodes.map((n) => [n.id, n])),
    edges: definition.edges,
    envelope,
    workflowName,
    workflowScope,
    ownerUserId,
    workflowId: options.streamWorkflowId ?? '',
    streamSeq: 0,
    options,
    incomingByTarget,
    convergence: { arrivals: new Map(), flushed: new Set() },
    loopBodySink: null,
  };

  /*
   * The trigger is the first row of every run: it is what proves the event actually reached the
   * graph, and which event type matched.
   *
   * It must also **stream**, like every other node. The canvas is driven only by the run stream, so a
   * node that records a step without emitting one is never painted — which is why the trigger node
   * stayed grey/pulsing while every node after it turned green.
   *
   * There is no `running` phase: the trigger is already satisfied by the time the walk begins, so it
   * goes straight to `succeeded`.
   */
  ctx.options.run?.recordStep({
    nodeId: trigger.id,
    nodeKind: trigger.kind,
    status: 'succeeded',
    itemsInCount: seedItems.length,
    itemsOutCount: seedItems.length,
    durationMs: 0,
    detail: {
      eventType: trigger.eventType,
      matchedEventType: envelope.type,
      sampleFields: summarizeRunPayload(envelope.payload ?? {}),
      ...captureRunIo([], seedItems),
    },
  });
  streamNode(ctx, trigger.id, trigger.kind, 'succeeded');

  await walkNode(ctx, trigger.id, seedItems, new Set(), undefined);
  // The first pass ends when the depth-first walk runs out of edges. Any merge that is still holding
  // branches runs now, which is the "or the walk ends" half of the convergence rule: an IF that took
  // the other port leaves one branch with nothing to deliver, and waiting for it would hang the run.
  await flushConvergences(ctx);
}

/**
 * Continue a graph from the node a `wait` suspended at (phase 36).
 *
 * This is deliberately a **second entry point** rather than a flag on the one above. The two start
 * at different places for different reasons: a fresh run begins at the trigger with the envelope as
 * its seed, whereas a resume begins at the wait with the **items that were parked on the resume
 * row**. Sharing a function would mean a `startAt` parameter that only one caller ever sets, and the
 * seed logic (envelope → items) would have to be skipped conditionally.
 *
 * `nodeId` is seeded into `pathVisited` so the wait node is not re-entered — its own step already
 * ran, and re-running it would schedule a second resumption of the same run.
 */
export async function resumeWorkflowGraphAfterSuspend(
  definition: LabWorkflowDefinitionV2,
  envelope: LabDomainEventEnvelopeV1,
  workflowName: string,
  workflowScope: LabWorkflowScope,
  ownerUserId: number | null,
  suspendNodeId: string,
  items: readonly LabWorkflowItem[],
  options: EvaluateWorkflowsOptions,
): Promise<void> {
  const suspendNode = definition.nodes.find((node) => node.id === suspendNodeId);
  if (!suspendNode) {
    // The node was deleted while the run waited. Finishing the run with a legible reason beats
    // hanging forever; guarding against a *changed* shape is the owner's job, but a dangling
    // reference is the runtime's.
    throw new Error(
      `Cannot resume: node "${suspendNodeId}" is no longer part of this workflow.`,
    );
  }

  const incomingByTarget = new Map<string, LabWorkflowGraphEdgeV2[]>();
  for (const edge of definition.edges) {
    const list = incomingByTarget.get(edge.target) ?? [];
    list.push(edge);
    incomingByTarget.set(edge.target, list);
  }

  const ctx: WalkerContext = {
    nodesById: new Map(definition.nodes.map((n) => [n.id, n])),
    edges: definition.edges,
    envelope,
    workflowName,
    workflowScope,
    ownerUserId,
    workflowId: options.streamWorkflowId ?? '',
    streamSeq: 0,
    options,
    incomingByTarget,
    convergence: { arrivals: new Map(), flushed: new Set() },
    loopBodySink: null,
  };

  // Walk the edges leaving the wait, exactly as the original walk would have after it.
  const outs = outgoingEdges(ctx.edges, suspendNodeId, {});
  for (const edge of outs) {
    await walkNode(ctx, edge.target, items, new Set([suspendNodeId]), edge.id);
  }
  await flushConvergences(ctx);
}

async function walkNode(
  ctx: WalkerContext,
  nodeId: string,
  inputItems: readonly LabWorkflowItem[],
  pathVisited: Set<string>,
  viaEdgeId: string | undefined,
): Promise<void> {
  /*
   * The body's back-edge lands back on the loop. Capture what arrived and stop: `runLoopNode` owns
   * the iteration and is about to ask for its next pass, so re-entering it here would recurse.
   *
   * This is the only place the body's output can be observed — `pathVisited` guarantees we get here
   * exactly once per body pass, carrying the final item array of that pass.
   */
  if (ctx.loopBodySink && ctx.loopBodySink.loopId === nodeId) {
    ctx.loopBodySink.items = inputItems;
    return;
  }
  if (pathVisited.has(nodeId)) {
    return;
  }
  pathVisited.add(nodeId);
  const node = ctx.nodesById.get(nodeId);
  if (!node) {
    return;
  }

  if (isConvergenceNode(node) && node.kind === 'action') {
    if (viaEdgeId) {
      // Park the arrival and stop. The node is executed by `flushConvergences` once every branch it
      // can actually receive has landed — running it here would mean running it once per branch,
      // with only the last branch's data.
      recordArrival(ctx, nodeId, viaEdgeId, inputItems);
      return;
    }
    // Reached with no edge (a direct call): behave like an ordinary action over one branch rather
    // than buffering data nobody will flush.
    await runActionNode(ctx, node, inputItems, undefined, pathVisited);
    return;
  }

  if (node.kind === 'condition') {
    const startedAt = Date.now();
    let pass = false;
    let conditionError: string | undefined;
    try {
      pass = await workflowConditionsMatch(
        node.conditions,
        ctx.envelope.payload,
        {
          scope: ctx.workflowScope,
          ownerUserId: ctx.ownerUserId,
        },
        ctx.envelope,
      );
    } catch (err) {
      conditionError = err instanceof Error ? err.message : 'Could not evaluate this condition';
      pass = false;
    }
    ctx.options.run?.recordStep({
      nodeId,
      nodeKind: node.kind,
      status: pass ? 'succeeded' : 'skipped',
      itemsInCount: inputItems.length,
      itemsOutCount: pass ? inputItems.length : 0,
      durationMs: Date.now() - startedAt,
      detail: {
        matched: pass,
        ...(conditionError ? { conditionError } : {}),
      },
    });
    // No early return on a failed condition: `on_false` edges exist precisely to handle that
    // branch, and `outgoingEdges` already filters by the verdict.
    const outs = outgoingEdges(ctx.edges, nodeId, { conditionPass: pass });
    for (const edge of outs) {
      await walkNode(ctx, edge.target, inputItems, new Set(pathVisited), edge.id);
    }
    return;
  }

  if (node.kind === 'rule') {
    const startedAt = Date.now();
    let matches = false;
    let ruleError: string | undefined;
    try {
      matches = await workflowGraphRuleNodeMatches(
        node,
        { schemaVersion: 2, nodes: [...ctx.nodesById.values()], edges: ctx.edges },
        ctx.envelope,
        ctx.workflowScope,
        ctx.ownerUserId,
      );
    } catch (err) {
      ruleError = err instanceof Error ? err.message : 'Could not evaluate this rule';
      matches = false;
    }
    ctx.options.run?.recordStep({
      nodeId,
      nodeKind: node.kind,
      status: matches ? 'succeeded' : 'skipped',
      itemsInCount: inputItems.length,
      itemsOutCount: matches ? inputItems.length : 0,
      durationMs: Date.now() - startedAt,
      detail: {
        matched: matches,
        ...(ruleError ? { ruleError } : {}),
      },
    });
    // Same as the condition branch: `on_no_match` edges are a legitimate branch.
    const outs = outgoingEdges(ctx.edges, nodeId, { ruleMatch: matches });
    for (const edge of outs) {
      await walkNode(ctx, edge.target, inputItems, new Set(pathVisited), edge.id);
    }
    return;
  }

  if (node.kind === 'group') {
    const groupStartedAt = Date.now();
    const groupConfig = normalizeWorkflowGroupNode(node);
    const definition = {
      nodes: [...ctx.nodesById.values()],
      edges: ctx.edges,
      schemaVersion: 2 as const,
    };

    if (groupConfig.groupType === 'actions') {
      const actionMembers = labWorkflowGraphGroupMemberNodes(definition, nodeId, 'action');
      let groupItems: readonly LabWorkflowItem[] = inputItems;
      if (actionMembers.length > 0) {
        const groupOutput = await executeActionGroupMembers(
          definition,
          node,
          ctx.envelope,
          ctx.workflowName,
          ctx.options,
          inputItems,
          // The group runtime narrates its own members, so it needs the workflow the events belong to.
          ctx.workflowId,
        );
        groupItems = groupOutput.items;
      }
      ctx.options.run?.recordStep({
        nodeId,
        nodeKind: node.kind,
        status: 'succeeded',
        itemsInCount: inputItems.length,
        itemsOutCount: groupItems.length,
        durationMs: Date.now() - groupStartedAt,
        detail: {
          groupType: 'actions',
          memberCount: actionMembers.length,
          executionMode: groupConfig.executionMode,
          failurePolicy: groupConfig.failurePolicy,
        },
      });
      const outs = outgoingEdges(ctx.edges, nodeId, {});
      for (const edge of outs) {
        if (isGroupMemberNode(definition, nodeId, edge.target)) {
          continue;
        }
        await walkNode(ctx, edge.target, groupItems, new Set(pathVisited), edge.id);
      }
      return;
    }

    const ruleMembers = labWorkflowGraphGroupMemberNodes(definition, nodeId, 'rule');
    let ruleMatch = false;
    if (ruleMembers.length > 0) {
      ruleMatch = await evaluateRuleGroupMembers(
        definition,
        node,
        ctx.envelope,
        ctx.workflowScope,
        ctx.ownerUserId,
      );
    }
    if (!ruleMatch && !groupConfig.continueOnNoMatch) {
      ctx.options.run?.recordStep({
        nodeId,
        nodeKind: node.kind,
        status: 'skipped',
        itemsInCount: inputItems.length,
        itemsOutCount: 0,
        durationMs: Date.now() - groupStartedAt,
        detail: {
          groupType: 'rules',
          memberCount: ruleMembers.length,
          ruleCombine: groupConfig.ruleCombine,
          matched: false,
          continueOnNoMatch: false,
        },
      });
      return;
    }
    ctx.options.run?.recordStep({
      nodeId,
      nodeKind: node.kind,
      status: 'succeeded',
      itemsInCount: inputItems.length,
      itemsOutCount: inputItems.length,
      durationMs: Date.now() - groupStartedAt,
      detail: {
        groupType: 'rules',
        memberCount: ruleMembers.length,
        ruleCombine: groupConfig.ruleCombine,
        matched: ruleMatch,
        continueOnNoMatch: groupConfig.continueOnNoMatch,
      },
    });
    const outs = outgoingEdges(ctx.edges, nodeId, { ruleMatch });
    for (const edge of outs) {
      if (isGroupMemberNode(definition, nodeId, edge.target)) {
        continue;
      }
      await walkNode(
        ctx,
        edge.target,
        // A rules group is a decision node: hand the data through, do not reset it.
        inputItems,
        new Set(pathVisited),
        edge.id,
      );
    }
    return;
  }

  if (node.kind === 'action' && node.step.kind === 'loop') {
    await runLoopNode(ctx, node as LoopActionNode, inputItems);
    return;
  }

  if (node.kind === 'action') {
    await runActionNode(ctx, node, inputItems, undefined, pathVisited);
    return;
  }

  const outs = outgoingEdges(ctx.edges, nodeId, {});
  for (const edge of outs) {
    await walkNode(ctx, edge.target, inputItems, new Set(pathVisited), edge.id);
  }
}

/**
 * Run one action node, record it, and walk its outgoing edges.
 *
 * Extracted from the walk so the convergence pass executes a merge through **exactly** the same path
 * as an ordinary action. A second copy of the record-and-forward logic is how a merge would quietly
 * stop honouring retry policy or stop reporting `detail`.
 */
/**
 * Run a bounded loop.
 *
 * Iteration is graph traversal, not a step-loop: the body's last node links back to this loop node,
 * which is normally impossible because `walkNode` refuses to re-enter a node. So the loop drives its
 * own passes explicitly and gives each body pass a **fresh** `pathVisited` — except this loop's own
 * id, which stays on the set so the body's back-edge lands on the loop rather than recursing.
 *
 * `maxIterations` is the bound. Without it a body that never changes the condition would spin until
 * the process died, which is why the schema makes it required.
 */
/** The loop node narrowed to its loop step, so `step.maxIterations` is typed rather than optional. */
type LoopActionNode = ActionNode & {
  step: { kind: 'loop'; maxIterations: number; while?: LabRuleConditionV1[] };
};

async function runLoopNode(
  ctx: WalkerContext,
  node: LoopActionNode,
  seedItems: readonly LabWorkflowItem[],
): Promise<void> {
  // The body is whatever leaves port 0; `done` leaves port 1. Resolved once — the graph cannot
  // change mid-run.
  const bodyEdges = outgoingEdges(ctx.edges, node.id, { outputIndex: 0 });
  const doneEdges = outgoingEdges(ctx.edges, node.id, { outputIndex: 1 });
  let items: readonly LabWorkflowItem[] = seedItems;
  let iteration = 0;
  let exhausted = false;

  // A loop with no body edge can never advance: it is a cap test that immediately satisfies nothing.
  if (bodyEdges.length === 0) {
    ctx.options.run?.recordStep({
      nodeId: node.id,
      nodeKind: node.kind,
      status: 'skipped',
      itemsInCount: seedItems.length,
      itemsOutCount: seedItems.length,
      durationMs: 0,
      detail: { stepKind: 'loop', reason: 'no body edge', maxIterations: node.step.maxIterations },
    });
    for (const edge of doneEdges) {
      await walkNode(ctx, edge.target, seedItems, new Set([node.id]), edge.id);
    }
    return;
  }

  while (iteration < node.step.maxIterations) {
    iteration += 1;
    const startedAt = Date.now();
    streamNode(ctx, node.id, node.kind, 'running');

    // Ask the step runner to decide this pass. It reports the port and stamps the item with
    // `loopIteration` / `loopExhausted`, which is what makes the outcome inspectable downstream.
    const decision = await runWorkflowStep({
      step: node.step,
      envelope: ctx.envelope,
      items,
      workflowName: ctx.workflowName,
      nodeId: node.id,
      loopIteration: iteration,
      options: ctx.options,
    });

    if (decision.kind === 'abort') {
      streamNode(ctx, node.id, node.kind, 'failed');
      ctx.options.run?.recordStep({
        nodeId: node.id,
        nodeKind: node.kind,
        status: classifyStepStatus(decision.reason),
        itemsInCount: items.length,
        itemsOutCount: 0,
        durationMs: Date.now() - startedAt,
        detail: { stepKind: 'loop', iteration, maxIterations: node.step.maxIterations },
        error: decision.reason,
      });
      return;
    }

    const iterationItems = decision.output.items;
    const continueBody = decision.output.outputIndex === 0;
    if (continueBody) {
      exhausted = false;
    } else {
      // `done` for a reason other than the cap means the `while` test said stop.
      exhausted = iteration < node.step.maxIterations;
    }

    streamNode(ctx, node.id, node.kind, 'succeeded');
    ctx.options.run?.recordStep({
      nodeId: node.id,
      nodeKind: node.kind,
      status: 'succeeded',
      itemsInCount: items.length,
      itemsOutCount: continueBody ? iterationItems.length : 0,
      durationMs: Date.now() - startedAt,
      // One row per pass, not one per node: without this the panel shows a single loop step and the
      // reader cannot tell whether it iterated once or hit the cap.
      detail: {
        stepKind: 'loop',
        iteration,
        maxIterations: node.step.maxIterations,
        continueBody,
        ...(decision.detail ?? {}),
      },
    });

    if (!continueBody) {
      // Exhausted by the cap: stamp it so the `done` branch can tell "finished early" from "ran out".
      items = iterationItems;
      if (exhausted) {
        items = iterationItems.map((item, itemIndex) => ({
          json: { ...item.json, loopExhausted: true },
          pairedItem: { nodeId: node.id, itemIndex },
        }));
      }
      for (const edge of doneEdges) {
        await walkNode(ctx, edge.target, items, new Set([node.id]), edge.id);
      }
      return;
    }

    /*
     * Walk the body with a fresh visited set so the body's own nodes can each run every pass. The
     * loop's id stays in the set, which is what stops the body's back-edge from recursing into the
     * loop instead of returning here.
     *
     * The sink is armed for the duration of the walk: the back-edge calls `walkNode` for this loop,
     * `walkNode` parks the arriving items on the sink and returns, and those items become the next
     * pass's input. Without this the body's output was thrown away and `items` reset to
     * `iterationItems` every pass — the loop and its body all reported success while the value the
     * body was accumulating never changed.
     */
    ctx.loopBodySink = { loopId: node.id, items: iterationItems };
    try {
      for (const edge of bodyEdges) {
        await walkNode(ctx, edge.target, iterationItems, new Set([node.id]), edge.id);
      }
      items = ctx.loopBodySink.items;
    } finally {
      ctx.loopBodySink = null;
    }
  }

  // Cap reached without the body ever signalling done — the classic runaway case.
  const capped = items.map((item, itemIndex) => ({
    json: { ...item.json, loopExhausted: true, loopMaxIterations: node.step.maxIterations },
    pairedItem: { nodeId: node.id, itemIndex },
  }));
  /*
   * Emit the terminal stream event before leaving.
   *
   * Every other exit from this function emits one: the per-pass `succeeded` at the end of each
   * iteration, `failed` on abort, and `skipped` when there is no body edge. This cap-reached path
   * recorded a step but streamed nothing, so the canvas was left showing the loop as `running` —
   * permanently blue — even though the run completed and the `done` branch fired. The run history
   * looked correct, which is exactly why it read as a cosmetic glitch rather than a missing event.
   *
   * Status is `succeeded`: reaching the cap is a legitimate outcome of a bounded loop, not a failure.
   *
   * Kept for consistency rather than as a proven fix for the "loop stayed blue" report — the last
   * per-pass emit already settles the node, so this is a redundant terminal event, not the cause.
   */
  streamNode(ctx, node.id, node.kind, 'succeeded');
  ctx.options.run?.recordStep({
    nodeId: node.id,
    nodeKind: node.kind,
    status: 'succeeded',
    itemsInCount: items.length,
    itemsOutCount: capped.length,
    durationMs: 0,
    detail: {
      stepKind: 'loop',
      iteration,
      maxIterations: node.step.maxIterations,
      continueBody: false,
      capReached: true,
    },
  });
  for (const edge of doneEdges) {
    await walkNode(ctx, edge.target, capped, new Set([node.id]), edge.id);
  }
}

async function runActionNode(
  ctx: WalkerContext,
  node: ActionNode,
  items: readonly LabWorkflowItem[],
  branchItems: readonly (readonly LabWorkflowItem[])[] | undefined,
  pathVisited: Set<string>,
  loopIteration?: number,
): Promise<void> {
  const startedAt = Date.now();
  // Announced before the step runs, so the canvas shows this node as in-flight while a slow
  // connector call is happening rather than after it has already finished.
  streamNode(ctx, node.id, node.kind, 'running');
  const outcome = await runWorkflowStep({
    step: node.step,
    envelope: ctx.envelope,
    items,
    branchItems,
    workflowName: ctx.workflowName,
    nodeId: node.id,
    policy: node,
    loopIteration,
    options: ctx.options,
  });
  const nodeStatus = outcome.kind === 'abort' ? classifyStepStatus(outcome.reason) : 'succeeded';
  streamNode(ctx, node.id, node.kind, nodeStatus);
  const outItems =
    outcome.kind === 'continue' || outcome.kind === 'suspend' ? outcome.output.items : [];
  ctx.options.run?.recordStep({
    nodeId: node.id,
    nodeKind: node.kind,
    status: outcome.kind === 'abort' ? classifyStepStatus(outcome.reason) : 'succeeded',
    itemsInCount: items.length,
    itemsOutCount: outItems.length,
    durationMs: Date.now() - startedAt,
    // The node knows what it actually did — how many recipients it resolved and reached. Naming
    // the step kind is only the fallback for a node that reports nothing.
    detail: {
      ...(outcome.kind === 'abort' ? {} : (outcome.detail ?? {})),
      stepKind: node.step.kind,
      // Input and output captured on every step. Without these, "did the node receive the value it
      // was supposed to?" and "did it produce what I expected?" are answerable only by adding
      // temporary logging — which is exactly the position a workflow author is in when a graph
      // misbehaves. The payloads are size-capped by `capRunPayload` so a run stays small.
      ...captureRunIo(items, outItems),
    },
    error: outcome.kind === 'abort' ? outcome.reason : null,
  });
  if (outcome.kind === 'abort') {
    return;
  }
  if (outcome.kind === 'suspend') {
    // Persist and stop. The walker does not traverse the outgoing edges — the clock will, later,
    // from exactly this node. `output.items` is what the next node needs, and because `wait` passes
    // its input through unchanged, it is also what arrived here.
    ctx.options.onSuspend?.({
      nodeId: node.id,
      items: outcome.output.items,
      resumeAt: outcome.resumeAt,
    });
    return;
  }
  const output = outcome.output;
  // A node that emitted rows on **several** ports walks each port separately, with that port's own
  // rows. This is what makes an IF able to feed both of its branches from one mixed batch.
  const ports: (number | undefined)[] = output.branches
    ? Object.keys(output.branches)
        .map((key) => Number(key))
        .sort((left, right) => left - right)
    : [output.outputIndex];

  for (const port of ports) {
    const portItems = port != null && output.branches ? (output.branches[port] ?? []) : output.items;
    /*
     * A routing node names the port it emitted; every other node leaves `outputIndex` undefined,
     * which keeps every pre-W7 edge (no index) takeable.
     *
     * ## Why `conditionPass` must be supplied too
     *
     * An IF's edges carry **two** encodings of the same branch: `outputIndex` (0/1) and `when`
     * (`on_true`/`on_false`). `edgeWhenAllows` evaluates `when`, and for `on_true`/`on_false` it
     * requires `ctx.conditionPass` to be exactly true/false. Passing only the port left that field
     * `undefined`, so `edgeWhenAllows` returned false for every branch and the run stopped dead at
     * the first IF — while the node itself reported success, which is why the history showed the
     * condition passing and nothing after it.
     *
     * The port *is* the verdict for an IF (0 = true, 1 = false), so deriving one from the other
     * keeps both encodings consistent. Switch routings carry no `when` semantics, and a step that is
     * not a routing node leaves both undefined so pre-W7 edges stay takeable.
     */
    const isIfAction = node.step.kind === 'if_condition';
    const outs = outgoingEdges(ctx.edges, node.id, {
      outputIndex: port,
      ...(isIfAction && port != null ? { conditionPass: port === 0 } : {}),
    });
    for (const edge of outs) {
      await walkNode(ctx, edge.target, portItems, new Set(pathVisited), edge.id);
    }
  }
}

function recordArrival(
  ctx: WalkerContext,
  nodeId: string,
  edgeId: string,
  items: readonly LabWorkflowItem[],
): void {
  const slots = ctx.convergence.arrivals.get(nodeId) ?? new Map<string, readonly LabWorkflowItem[]>();
  // An edge can only deliver once per run; a second delivery would duplicate a branch and silently
  // multiply rows in an `append` merge.
  if (!slots.has(edgeId)) {
    slots.set(edgeId, items);
  }
  ctx.convergence.arrivals.set(nodeId, slots);
}

/**
 * Execute every buffered convergence node, in rounds.
 *
 * Rounds, not a single pass, because executing a merge can walk edges that lead to *another* merge.
 * The loop ends when a round finds nothing new, which terminates because `flushed` only grows and the
 * graph is acyclic (enforced by the validator).
 */
async function flushConvergences(ctx: WalkerContext): Promise<void> {
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const nodeId of [...ctx.convergence.arrivals.keys()]) {
      if (ctx.convergence.flushed.has(nodeId)) {
        continue;
      }
      const node = ctx.nodesById.get(nodeId);
      if (!node || !isConvergenceNode(node) || node.kind !== 'action') {
        ctx.convergence.flushed.add(nodeId);
        continue;
      }
      ctx.convergence.flushed.add(nodeId);
      progressed = true;

      const incoming = ctx.incomingByTarget.get(nodeId) ?? [];
      const slots = ctx.convergence.arrivals.get(nodeId) ?? new Map();
      // A branch that never delivered contributes an empty array. The alternative — waiting for it —
      // is exactly the hang the handoff warns about, because an IF that took the other port will
      // never deliver the branch it skipped.
      const branches = incoming.map((edge) => slots.get(edge.id) ?? []);
      const flat = branches.flat();
      // Seeded with its own id so a malformed back-edge cannot recurse into this node again.
      await runActionNode(ctx, node, flat, branches, new Set([nodeId]));
    }
  }
}
