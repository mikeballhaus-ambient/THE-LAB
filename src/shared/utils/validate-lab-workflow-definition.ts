import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type {
  LabDomainEventCatalogEntry,
  LabDomainEventObservedType,
} from '@/shared/types/lab-domain-event-catalog';
import { isKnownEventType } from '@/shared/services/lab-domain-event-catalog';
import { labWorkflowGraphGroupMemberNodes } from '@/shared/utils/lab-workflow-graph-group';
import { validateScheduleExpression } from '@/shared/utils/lab-workflow-schedule-time';
import { IANAZone } from 'luxon';

/**
 * Structural validation for a workflow graph (W3).
 *
 * ## Why this is not just the Zod schema
 *
 * `parseLabWorkflowDefinition` answers *is this the right shape*. It cannot answer:
 *
 * - does this edge point at a node that exists?
 * - are there two nodes with the same id?
 * - is there exactly one trigger?
 * - can every node actually be reached from the trigger?
 * - does the graph loop?
 *
 * All five are silent failures at runtime. A dangling edge is dropped by `outgoingEdges` — the
 * workflow simply does nothing past that point, and the user sees "it ran, but nothing happened".
 * That is precisely the class of bug that made the old event catalog unusable, so the validator
 * exists to reject it at save time (proposal decision #10: **reject, do not warn**).
 *
 * ## Errors vs warnings
 *
 * An **error** makes the graph unrunnable and blocks saving. A **warning** describes something that
 * works but is probably a mistake — an unreachable node, a rule with no conditions (always true).
 * Warnings are shown in the editor; they must never block, or authors will learn to ignore them.
 */

export type LabWorkflowValidationSeverity = 'error' | 'warning';

export interface LabWorkflowValidationIssue {
  severity: LabWorkflowValidationSeverity;
  /** Stable machine code — the editor maps it to a message and a node highlight. */
  code:
    | 'missing_trigger'
    | 'multiple_triggers'
    | 'duplicate_node_id'
    | 'duplicate_edge_id'
    | 'dangling_edge'
    | 'self_edge'
    | 'cycle'
    | 'unreachable_node'
    | 'empty_rule'
    | 'orphan_group_member'
    | 'no_actions'
    | 'unknown_node_kind'
    | 'unknown_trigger_event'
    | 'merge_missing_key'
    | 'merge_single_branch'
    | 'invalid_schedule_zone'
    | 'invalid_schedule_expression'
    | 'missing_schedule_expression'
    | 'missing_schedule_interval'
    | 'schedule_below_floor'
    /** Phase 37: two trigger-mapping rows writing one output name. */
    | 'duplicate_mapping_target';
  /** Node or edge the issue is about, so the editor can focus it. */
  targetId: string | null;
  message: string;
}

export interface LabWorkflowValidationResult {
  valid: boolean;
  errors: LabWorkflowValidationIssue[];
  warnings: LabWorkflowValidationIssue[];
}

const KNOWN_NODE_KINDS = new Set(['trigger', 'condition', 'rule', 'action', 'group']);

export interface ValidateWorkflowDefinitionOptions {
  /**
   * Event types seen on the bus. Supplied by the save path so a trigger naming a real event that is
   * not yet documented does not produce a warning.
   */
  observedEventTypes?: LabDomainEventObservedType[];
  /** Declared catalog rows (API or merged manifests). Required for known-type warnings without bundle imports. */
  declaredCatalogEntries?: readonly LabDomainEventCatalogEntry[];
}

/**
 * Validate a v2 definition.
 *
 * Assumes the input already passed the Zod schema — this checks structure, not shape. Calling it on
 * unvalidated input is safe (everything is guarded) but the messages will be less specific.
 */
export function validateWorkflowDefinition(
  definition: LabWorkflowDefinitionV2,
  options: ValidateWorkflowDefinitionOptions = {},
): LabWorkflowValidationResult {
  const errors: LabWorkflowValidationIssue[] = [];
  const warnings: LabWorkflowValidationIssue[] = [];

  const nodes = Array.isArray(definition?.nodes) ? definition.nodes : [];
  const edges = Array.isArray(definition?.edges) ? definition.edges : [];

  const error = (
    code: LabWorkflowValidationIssue['code'],
    targetId: string | null,
    message: string,
  ) => errors.push({ severity: 'error', code, targetId, message });
  const warn = (
    code: LabWorkflowValidationIssue['code'],
    targetId: string | null,
    message: string,
  ) => warnings.push({ severity: 'warning', code, targetId, message });

  // --- node identity -------------------------------------------------------
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string' || node.id === '') {
      error('duplicate_node_id', null, 'A node has no id.');
      continue;
    }
    if (seenIds.has(node.id)) {
      duplicateIds.add(node.id);
      error(
        'duplicate_node_id',
        node.id,
        `Two nodes share the id "${node.id}". Ids must be unique or the graph cannot be traversed.`,
      );
    }
    seenIds.add(node.id);
    if (!KNOWN_NODE_KINDS.has(node.kind)) {
      error('unknown_node_kind', node.id, `Node "${node.id}" has an unknown kind.`);
    }
  }

  const byId = new Map<string, LabWorkflowGraphNodeV2>();
  for (const node of nodes) {
    if (node && typeof node.id === 'string' && !byId.has(node.id)) {
      byId.set(node.id, node);
    }
  }

  // --- trigger -------------------------------------------------------------
  const triggers = nodes.filter((node) => node?.kind === 'trigger');
  if (triggers.length === 0) {
    error('missing_trigger', null, 'A workflow needs exactly one trigger node.');
  } else if (triggers.length > 1) {
    for (const trigger of triggers) {
      error(
        'multiple_triggers',
        trigger.id,
        'A workflow can have only one trigger. Extra triggers never fire.',
      );
    }
  }

  // --- edge identity -------------------------------------------------------
  //
  // Node ids are checked above for uniqueness; edges were not, and that gap is load-bearing. The
  // canvas keys edges by `id`, so a repeated id renders as a **single** connector while the stored
  // array holds two. The details panel then lists the branch twice, and the second entry cannot be
  // selected on the canvas at all — the user has no affordance to delete it. `removeEdge(id)` filters
  // by id and would clear both, but nothing routes a click to a shadowed edge to begin with.
  //
  // Rejecting at save time is the only place this can be fixed without guessing: the graph is
  // ambiguous the moment two edges share an id, and silently re-minting one would change what the
  // author drew.
  const seenEdgeIds = new Set<string>();
  const duplicateEdgeIds = new Set<string>();
  for (const edge of edges) {
    const edgeId = edge?.id;
    if (!edgeId) {
      continue;
    }
    if (seenEdgeIds.has(edgeId)) {
      duplicateEdgeIds.add(edgeId);
      error(
        'duplicate_edge_id',
        edgeId,
        `Two connections share the id "${edgeId}". The canvas draws one line, so the other cannot be selected or removed — delete one connection before saving.`,
      );
    }
    seenEdgeIds.add(edgeId);
  }

  // --- edges ---------------------------------------------------------------
  for (const edge of edges) {
    if (!edge || typeof edge.source !== 'string' || typeof edge.target !== 'string') {
      continue;
    }
    if (!byId.has(edge.source)) {
      error(
        'dangling_edge',
        edge.id ?? null,
        `An edge starts at "${edge.source}", which is not a node in this graph.`,
      );
    }
    if (!byId.has(edge.target)) {
      error(
        'dangling_edge',
        edge.id ?? null,
        `An edge points at "${edge.target}", which is not a node in this graph. That branch will be silently skipped at run time.`,
      );
    }
    if (edge.source === edge.target) {
      error('self_edge', edge.id ?? null, 'A node cannot connect to itself.');
    }
  }

  // --- reachability and cycles --------------------------------------------
  const triggerId = triggers[0]?.id ?? null;
  if (triggerId && !duplicateIds.has(triggerId)) {
    const outgoing = new Map<string, string[]>();
    for (const edge of edges) {
      if (!byId.has(edge.source) || !byId.has(edge.target) || edge.source === edge.target) {
        continue;
      }
      const list = outgoing.get(edge.source) ?? [];
      list.push(edge.target);
      outgoing.set(edge.source, list);
    }

    const reachable = collectReachable(triggerId, outgoing);
    for (const node of nodes) {
      if (!node || node.id === triggerId) {
        continue;
      }
      // A group member is reached through its group, not through an edge of its own.
      if (node.kind === 'action' || node.kind === 'rule') {
        const groupId = (node as { groupId?: string }).groupId;
        if (groupId && reachable.has(groupId)) {
          continue;
        }
      }
      if (!reachable.has(node.id)) {
        warn(
          'unreachable_node',
          node.id,
          `Node "${node.id}" cannot be reached from the trigger, so it will never run.`,
        );
      }
    }

    const cycleNode = findCycleNode(outgoing);
    if (cycleNode) {
      // A cycle is only safe when it is driven by a `loop` node: that node owns the iteration count
      // and re-walks its body itself, so the ordinary walk never recurses. Any other cycle has no
      // bound and genuinely would recurse forever.
      const cycleNodeIsBoundedLoop = (() => {
        const node = byId.get(cycleNode);
        return node?.kind === 'action' && node.step.kind === 'loop';
      })();
      if (!cycleNodeIsBoundedLoop) {
        error(
          'cycle',
          cycleNode,
          'The graph contains a loop that no Loop node bounds. Workflows execute synchronously and would recurse forever.',
        );
      }
    }
  }

  // --- trigger output mapping (phase 37) -----------------------------------
  //
  // Structural only: the validator has no payload, so it cannot know whether `from` resolves. It *can*
  // know that two rows write the same `to`, which is ambiguous rather than a merge — one source would
  // silently win, and the author would have no way to tell which.
  for (const trigger of triggers) {
    if (trigger.kind !== 'trigger' || !trigger.mapping?.length) {
      continue;
    }
    const seenTargets = new Set<string>();
    for (const row of trigger.mapping) {
      const to = row.to?.trim();
      if (!to) {
        continue;
      }
      if (seenTargets.has(to)) {
        error(
          'duplicate_mapping_target',
          trigger.id,
          `Two mapping rows write "${to}". Give each output field a distinct name — last-one-wins would hide which source is used.`,
        );
      }
      seenTargets.add(to);
    }
  }

  // --- trigger event type --------------------------------------------------
  //
  // A trigger naming an event that is neither documented nor observed never fires. Nothing fails at
  // save time, nothing fails at run time, and the run history stays empty — so the author has no
  // signal at all. This is a **warning**, not an error: the static catalog is a declaration of
  // intent and an app may publish a new event before this file learns about it. Blocking would make
  // the platform reject working workflows; warning still shows the typo before it wastes a day.
  const observedEventTypes = options.observedEventTypes;
  for (const trigger of triggers) {
    if (trigger.kind !== 'trigger') {
      continue;
    }
    const eventType = trigger.eventType?.trim();
    if (!eventType) {
      continue;
    }
    if (!isKnownEventType(eventType, observedEventTypes, options.declaredCatalogEntries ?? [])) {
      warn(
        'unknown_trigger_event',
        trigger.id,
        `No event type "${eventType}" is documented or has ever been published. This workflow will not fire unless an app publishes it.`,
      );
    }
  }

  // --- authored schedules (phase 34) ---------------------------------------
  //
  // A schedule that cannot be parsed or whose zone is unknown is **rejected**, not warned about. Both
  // failures produce a schedule that stores cleanly and then never fires (or fires at the wrong hour
  // forever, if the zone silently fell back to UTC), and neither leaves a symptom the author could
  // find. The runtime helpers fall back to UTC with a warning because a *stored* row must still be
  // evaluated; the authoring path is the place to refuse it.
  for (const trigger of triggers) {
    if (trigger.kind !== 'trigger' || !trigger.schedule) {
      continue;
    }
    const schedule = trigger.schedule;
    const zone = schedule.timezone?.trim() ?? '';
    if (!zone || !IANAZone.isValidZone(zone)) {
      error(
        'invalid_schedule_zone',
        trigger.id,
        zone
          ? `"${zone}" is not a known IANA time zone. Use a name like "America/Denver" — a fixed offset breaks at daylight saving.`
          : 'A schedule needs an IANA time zone (for example "America/Denver").',
      );
    }

    if (schedule.kind === 'interval') {
      if (schedule.intervalMinutes == null || schedule.intervalMinutes <= 0) {
        error(
          'missing_schedule_interval',
          trigger.id,
          'An interval schedule needs a positive number of minutes between fires.',
        );
      } else if (schedule.intervalMinutes < 1) {
        warn(
          'schedule_below_floor',
          trigger.id,
          'Intervals below 60 seconds are legal to type but the platform floor is one minute, so this will fire less often than written.',
        );
      }
    } else {
      if (!schedule.expression?.trim()) {
        error(
          'missing_schedule_expression',
          trigger.id,
          schedule.kind === 'cron'
            ? 'A cron schedule needs a 5-field expression, for example "0 9 * * 1-5".'
            : 'A recurrence schedule needs an RRULE body, for example "FREQ=WEEKLY;BYDAY=MO".',
        );
      } else {
        const problem = validateScheduleExpression({
          kind: schedule.kind,
          expression: schedule.expression,
        });
        if (problem) {
          error('invalid_schedule_expression', trigger.id, problem);
        }
      }
    }
  }

  // --- groups --------------------------------------------------------------
  for (const node of nodes) {
    if (!node || node.kind !== 'group') {
      continue;
    }
    const members = {
      action: labWorkflowGraphGroupMemberNodes(definition, node.id, 'action'),
      rule: labWorkflowGraphGroupMemberNodes(definition, node.id, 'rule'),
    };
    if (members.action.length === 0 && members.rule.length === 0) {
      warn('orphan_group_member', node.id, 'This group has no members, so it does nothing.');
    }
  }

  // --- semantic warnings ---------------------------------------------------
  for (const node of nodes) {
    if (!node || node.kind !== 'rule') {
      continue;
    }
    const conditions = node.conditions;
    // A rule with no conditions matches everything. That is sometimes intended, but it is far more
    // often a half-finished node, and it is invisible in the run history because the rule "succeeded".
    if (!conditions || conditions.length === 0) {
      warn(
        'empty_rule',
        node.id,
        'This rule has no conditions, so it always matches. Every event reaching it will continue.',
      );
    }
  }

  // --- merging -------------------------------------------------------------
  //
  // A `by_key` merge without a key joins nothing and returns its base rows unchanged, which looks
  // exactly like a successful run in the panel. Rejecting it at save time is the only place the
  // author can still act on it — the schema cannot express the rule because a `.refine()` on a
  // discriminated-union member breaks the union, so it lives here, at gate G3.
  const incomingEdgeCount = new Map<string, number>();
  for (const edge of edges) {
    if (!edge || typeof edge.target !== 'string') {
      continue;
    }
    incomingEdgeCount.set(edge.target, (incomingEdgeCount.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    if (!node || node.kind !== 'action') {
      continue;
    }
    if (node.step?.kind !== 'merge_items') {
      continue;
    }
    if (node.step.mode === 'by_key' && !node.step.keyPath) {
      error(
        'merge_missing_key',
        node.id,
        'A merge by key needs a key field. Without one it joins nothing and passes its first branch through unchanged.',
      );
    }
    if ((incomingEdgeCount.get(node.id) ?? 0) < 2) {
      // Not an error: a merge with one input is just a pass-through, and a user may be mid-edit.
      warn(
        'merge_single_branch',
        node.id,
        'This merge has fewer than two incoming connections, so there is nothing to join.',
      );
    }
  }

  const actions = nodes.filter((node) => node?.kind === 'action');
  if (nodes.length > 0 && actions.length === 0) {
    warn(
      'no_actions',
      null,
      'This workflow has no action nodes, so matching an event does nothing.',
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

function collectReachable(startId: string, outgoing: Map<string, string[]>): Set<string> {
  const reached = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reached.has(id)) {
      continue;
    }
    reached.add(id);
    for (const next of outgoing.get(id) ?? []) {
      if (!reached.has(next)) {
        stack.push(next);
      }
    }
  }
  return reached;
}

/**
 * Find a node that participates in a cycle, or null.
 *
 * Iterative depth-first search with an explicit colour map: `1` = on the current path, `2` = done.
 * Recursion is avoided because graph depth is user-controlled.
 */
function findCycleNode(outgoing: Map<string, string[]>): string | null {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();

  for (const start of outgoing.keys()) {
    if ((colour.get(start) ?? WHITE) !== WHITE) {
      continue;
    }
    const stack: Array<{ id: string; childIndex: number }> = [{ id: start, childIndex: 0 }];
    colour.set(start, GREY);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const children = outgoing.get(frame.id) ?? [];
      if (frame.childIndex >= children.length) {
        colour.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const child = children[frame.childIndex]!;
      frame.childIndex += 1;
      const childColour = colour.get(child) ?? WHITE;
      if (childColour === GREY) {
        return child;
      }
      if (childColour === WHITE) {
        colour.set(child, GREY);
        stack.push({ id: child, childIndex: 0 });
      }
    }
  }
  return null;
}

/** One-line summary for a toast or API response. */
export function summarizeValidation(result: LabWorkflowValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Workflow is valid.';
  }
  const parts: string[] = [];
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error(s)`);
  }
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }
  return parts.join(', ');
}
