import { randomUUID } from 'node:crypto';
import type { Server as SocketIOServer } from 'socket.io';
import type { LabDomainEventEnvelopeV1, LabUserNotification } from '@/shared/types/lab-domain-event';
import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowNodeExecutionPolicy } from '@/shared/types/lab-workflow-graph';
import {
  emptyOutput,
  passThroughItems,
  singleItemOutput,
  type LabWorkflowItem,
  type LabWorkflowNodeOutput,
} from '@/shared/types/lab-workflow-items';
import { labEventsRepository } from '../db/LabEvents/lab-events-repository';
import { publishLabDomainEventPipeline } from '../lab-events/publish-lab-domain-event-pipeline';
import { labRulesRepository } from '../db/LabRules/lab-rules-repository';
import { labRulesService } from '../db/LabRules/lab-rules-service';
import { fanOutLabNotifications } from '../lab-events/fan-out-lab-publish-result';
import { labVirtualBankRepository } from '../db/LabVirtualBank/lab-virtual-bank-repository';
import { emitLabShellToastToUser } from '../lab-events/lab-events-toast';
import type { LabVirtualBankDailyAllotmentEligibility } from '@/shared/types/lab-virtual-bank';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { getPayloadValueAtPath } from '@/shared/utils/lab-payload-path';
import { resolveLabWorkflowPayloadUserId } from './lab-workflow-recipient-resolver';
import { validateOutboundUrl, LAB_WORKFLOW_HTTP_MAX_RESPONSE_BYTES } from '@/shared/utils/lab-workflow-outbound-url';
import { fetchOutbound } from './lab-workflow-http-client';
import {
  renderWorkflowJsonTemplates,
  renderWorkflowMessageTemplate,
} from '@/shared/utils/lab-workflow-notification-copy';
import userService from '../db/Auth/auth-service';
import { labApprovalsService } from '../db/LabApprovals/lab-approvals-service';
import { labLedgerService } from '../db/LabLedger/lab-ledger-service';
import {
  workflowCommsDmTextForEvent,
  workflowNotificationCopyForEvent,
} from '@/shared/utils/lab-workflow-notification-copy';
import {
  resolveLabNotificationActionsForScope,
  serializeLabNotificationActions,
  parseLabNotificationActionsJson,
} from '@/shared/utils/lab-notification-actions';
import { labCommsService } from '../comms/lab-comms-service';
import { broadcastLabCommsDmEnvelope } from '../comms/lab-comms-dm-broadcast';
import type { EvaluateWorkflowsOptions } from './lab-workflows-evaluator';
import {
  createIntegrationRecord,
  deleteIntegrationRecord,
  fetchIntegrationRecord,
  updateIntegrationRecord,
} from './lab-workflow-integration-connector-client';
import { resolveWorkflowIntegrationActorUser } from './lab-workflow-integration-runtime';
import {
  mergeIntegrationBodyFromPayload,
  resolveRecordIdFromPayload,
} from '@/shared/utils/lab-workflow-integration-body';
import {
  executeNodeWithPolicy,
  labWorkflowIdempotencyLedger,
  resolveIdempotencyKey,
} from './lab-workflow-node-executor';
import {
  applyDateTime,
  applyFilterItems,
  applyMergeItems,
  applyRenameFields,
  applySetFields,
  applySortLimitDedupe,
  applySplitOut,
} from '@/shared/utils/lab-workflow-item-transforms';
import { applyCodeStep, LabWorkflowCodeError } from './lab-workflow-code-node';
import { conditionsMatch } from '../lab-rules/lab-rules-match';

/**
 * Outcome of running one node.
 *
 * `output` carries the items forward; the evaluator hands them to the next node. `branch` is set
 * only by routing nodes. A node that aborts stops downstream traversal.
 *
 * `detail` is what the node wants recorded about itself — how many recipients it reached, how many
 * it skipped. Without it the run panel can only say "succeeded", which does not help a user who
 * expected a DM and got none.
 */
export type WorkflowStepOutcome =
  | { kind: 'continue'; output: LabWorkflowNodeOutput; detail?: Record<string, unknown> }
  | { kind: 'abort'; reason: string }
  /**
   * Stop this path and let the platform clock continue it (phase 36).
   *
   * Distinct from `abort`: `abort` means the path failed, `suspend` means it is fine but must wait.
   * The walker unwinds without recording the node as succeeded-and-continued, and the evaluator
   * persists `output.items` — which is exactly what the next node needs, because `wait` passes its
   * input through unchanged.
   */
  | {
      kind: 'suspend';
      resumeAt: string;
      output: LabWorkflowNodeOutput;
      detail?: Record<string, unknown>;
    };

function continueWith(
  output: LabWorkflowNodeOutput,
  detail?: Record<string, unknown>,
): WorkflowStepOutcome {
  return detail ? { kind: 'continue', output, detail } : { kind: 'continue', output };
}

function abortWith(reason: string): WorkflowStepOutcome {
  return { kind: 'abort', reason };
}

/**
 * True when the caller **supplied** an item array.
 *
 * Note the deliberate `length` check being absent: an empty array is a meaningful value — it is what
 * a Filter that dropped every row hands to the next node — and must not be mistaken for "no input
 * given" and reset to the envelope payload. Only `undefined` means "the evaluator did not thread
 * anything", which is the legacy direct-call case.
 */
function hasItems(input: readonly LabWorkflowItem[] | undefined): input is LabWorkflowItem[] {
  return Array.isArray(input);
}

async function fanOutNotifications(
  io: SocketIOServer | undefined,
  notifications: LabUserNotification[],
): Promise<void> {
  if (!io || notifications.length === 0) {
    return;
  }
  await fanOutLabNotifications(io, notifications);
}

/**
 * Insert one in-app notification.
 *
 * Returns null instead of throwing. `lab_user_notifications.user_id` is a foreign key, so a payload
 * naming a user who no longer exists — a stale `assigneeId` in an event, a deleted account — raises
 * a constraint error. Before this guard that error escaped the node, was caught by the evaluator,
 * and marked the **entire run** as failed, even though every other recipient was fine. One bad id
 * must cost one notification, not the run.
 */
async function insertWorkflowNotification(
  userId: number,
  eventId: string,
  title: string,
  body: string,
  actions?: LabNotificationAction[],
): Promise<LabUserNotification | null> {
  const notificationId = `wf_${userId}_${eventId}_${randomUUID()}`;
  const actionsJson = serializeLabNotificationActions(actions);
  try {
    labEventsRepository.insertNotification(notificationId, userId, eventId, title, body, null, actionsJson);
  } catch (err) {
    console.warn('[lab-workflows] notification skipped — user not insertable', userId, err);
    return null;
  }
  const row = await labEventsRepository.getNotificationById(notificationId);
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    title: row.title,
    body: row.body,
    readAt: row.readAt ?? undefined,
    createdAt: row.createdAt,
    actions: parseLabNotificationActionsJson(row.actionsJson) ?? actions,
  };
}

export interface RunWorkflowStepParams {
  step: LabWorkflowStepV1;
  envelope: LabDomainEventEnvelopeV1;
  workflowName: string;
  /** Item for this node. Defaults to the envelope payload as a single item. */
  items?: readonly LabWorkflowItem[];
  /**
   * Multi-branch input, in **edge order**, supplied only to a converging node (`merge_items`).
   *
   * A merge is not a function of one array: `by_index` pairs row *i* across branches and `by_key`
   * treats the first branch as the base, so flattening before the node loses the branch boundary.
   * Every other node ignores this field, which keeps one runner signature for both shapes.
   */
  branchItems?: readonly (readonly LabWorkflowItem[])[];
  /** Stable node id used for `pairedItem` provenance. */
  nodeId?: string;
  /**
   * Execution policy for this node (W2). Supplied by the evaluator from the node's own fields, so
   * the same step kind can be retried in one graph and not in another.
   */
  policy?: LabWorkflowNodeExecutionPolicy;
  /**
   * Which pass through a `loop` node this is, 1-based. Supplied by the walker, which owns iteration —
   * the runner stays stateless across calls, so it cannot count its own passes.
   */
  loopIteration?: number;
  options: EvaluateWorkflowsOptions;
}

/**
 * Run one node against a set of items.
 *
 * Nodes are applied **per item**: side-effecting nodes that act on a payload path run once for each
 * item, so a multi-item output from an upstream `Split Out` or `Loop` behaves as expected. Nodes
 * that produce no new items pass their input through, which keeps a chain of actions able to resolve
 * the same `path` at every step.
 */
export async function runWorkflowStep({
  step,
  envelope,
  workflowName,
  items,
  branchItems,
  nodeId = 'step',
  policy,
  loopIteration,
  options,
}: RunWorkflowStepParams): Promise<WorkflowStepOutcome> {
  const io = options.io;
  const inputItems: LabWorkflowItem[] = hasItems(items)
    ? [...items]
    : singleItemOutput(envelope.payload, nodeId).items;

  // ---------------------------------------------------------------------------------------------
  // Declarative data nodes (A2–A6).
  //
  // **No `dryRun` branch, deliberately.** These write only into their own item array; there is no
  // external effect to describe instead of performing, and previewing a transform by not applying it
  // would make the preview useless (the author's question is "what does the next node receive?").
  // Do not add an empty guard here for symmetry with the side-effecting nodes.
  // ---------------------------------------------------------------------------------------------
  if (step.kind === 'set_fields') {
    const result = applySetFields(inputItems, step.fields, envelope.payload, nodeId);
    return continueWith({ items: result.items }, result.detail);
  }

  // `code` is grouped with the data nodes because it only rewrites its own item array — there is no
  // external effect to describe in a dry run, for the same reason `set_fields` has no `dryRun` branch.
  if (step.kind === 'code') {
    try {
      const result = applyCodeStep(inputItems, step.source, nodeId, step.timeoutMs);
      return continueWith({ items: result.items }, result.detail);
    } catch (err) {
      // A bad script is the author's bug, not a platform fault: abort with the reason the sandbox
      // gave rather than letting it read as an internal error.
      return abortWith(
        err instanceof LabWorkflowCodeError ? err.message : 'The code node failed.',
      );
    }
  }

  if (step.kind === 'rename_fields') {
    const result = applyRenameFields(
      inputItems,
      step.renames ?? [],
      step.remove ?? [],
      envelope.payload,
      nodeId,
    );
    return continueWith({ items: result.items }, result.detail);
  }

  if (step.kind === 'date_time') {
    const result = applyDateTime(inputItems, step.operations, nodeId);
    return continueWith({ items: result.items }, result.detail);
  }

  if (step.kind === 'filter_items') {
    // Payload-only conditions (enforced by the schema), so a synchronous per-item predicate is
    // correct here — and it reuses the rule vocabulary so there is one condition model in the lab.
    const result = applyFilterItems(
      inputItems,
      step.conditions,
      step.combine ?? 'all',
      (condition, json) => conditionsMatch([condition], json),
      nodeId,
    );
    return continueWith({ items: result.items }, result.detail);
  }

  if (step.kind === 'sort_items') {
    const result = applySortLimitDedupe(
      inputItems,
      step.sort ?? [],
      step.limit,
      step.dedupeBy,
      nodeId,
    );
    return continueWith({ items: result.items }, result.detail);
  }

  // ---------------------------------------------------------------------------------------------
  // Routing nodes (W7).
  //
  // These are the nodes that read and set `outputIndex`. An IF is fixed at two ports (0 = true,
  // 1 = false); a Switch takes the first matching routing's port, or the fallback port.
  // ---------------------------------------------------------------------------------------------
  if (step.kind === 'if_condition') {
    const generate = (item: LabWorkflowItem): boolean =>
      step.combine === 'any'
        ? step.conditions.some((condition) => conditionsMatch([condition], item.json))
        : conditionsMatch(step.conditions, item.json);
    const passing = inputItems.filter((item) => generate(item));
    const failing = inputItems.filter((item) => !generate(item));
    // The primary port: the true port when anything passed, otherwise the false port, which is the
    // branch a user means by "otherwise" — not "nowhere". `items` therefore stays the single array
    // every pre-W7b consumer expects.
    const outputIndex = passing.length > 0 ? 0 : 1;
    // Both ports are emitted whenever both hold rows. Without this, a mixed batch could only ever
    // travel one branch, so "split the batch, enrich each half, merge it back" — the whole reason
    // Merge exists — was impossible: the other half was dropped without a count.
    const branches: Record<number, LabWorkflowItem[]> = {};
    if (passing.length > 0) {
      branches[0] = passing;
    }
    if (failing.length > 0) {
      branches[1] = failing;
    }
    return continueWith(
      {
        items: outputIndex === 0 ? passing : failing,
        outputIndex,
        branch: outputIndex === 0 ? 'true' : 'false',
        branches,
      },
      {
        stepKind: step.kind,
        matched: outputIndex === 0,
        trueCount: passing.length,
        falseCount: failing.length,
        outputIndex,
        itemCount: inputItems.length,
      },
    );
  }

  // L1b — loop iteration decision.
  //
  // The runner only decides **which port** this iteration takes; it does not iterate. Iteration is a
  // graph property (the body edge re-enters the loop node), so the walker owns the loop counter and
  // passes it down as `loopIteration`. Putting the counter here would make the step runner stateful
  // across calls, which it is deliberately not.
  //
  // Ports: 0 = body (`while` still true and under the cap), 1 = done (cap reached or `while` false).
  if (step.kind === 'loop') {
    // Read from the parameter, not `options`: the walker passes it per call, and `options` is shared
    // across the whole run — reading it there would let one pass's value leak into another.
    const iteration = loopIteration ?? 1;
    const underCap = iteration <= step.maxIterations;
    let conditionPass = true;
    if (step.while?.length) {
      // Evaluated against the first item: a loop runs one batch, so "may I continue?" is a question
      // about that batch, not about each row independently.
      const scope = inputItems[0]?.json ?? {};
      try {
        conditionPass = conditionsMatch(step.while, scope);
      } catch {
        // A malformed condition stops the loop rather than looping forever on an error.
        conditionPass = false;
      }
    }
    const continueBody = underCap && conditionPass;
    const done = inputItems.map((item, itemIndex) => ({
      json: {
        ...item.json,
        loopIteration: iteration,
        loopExhausted: !conditionPass && underCap,
        loopMaxIterations: step.maxIterations,
      },
      pairedItem: { nodeId, itemIndex },
    }));
    const outputIndex = continueBody ? 0 : 1;
    return continueWith(
      {
        items: done,
        outputIndex,
        branch: continueBody ? 'body' : 'done',
        branches: continueBody ? { 0: done } : { 1: done },
      },
      {
        stepKind: step.kind,
        iteration,
        maxIterations: step.maxIterations,
        continueBody,
        whileSatisfied: conditionPass,
        outputIndex,
      },
    );
  }

  if (step.kind === 'switch_condition') {
    const fallback = step.fallbackOutputIndex ?? step.routings.length;
    let chosen = fallback;
    let matchedRouting = -1;
    for (const [index, routing] of step.routings.entries()) {
      if (inputItems.some((item) => conditionsMatch(routing.conditions, item.json))) {
        chosen = index;
        matchedRouting = index;
        break;
      }
    }
    // A Switch routes the **whole batch** to one port. Per-item switching is what a chain of IF
    // nodes (or Split Out plus an IF on each expanded item) exists for; sending one batch to several
    // ports from a single node would require a merge rule the runtime does not have, and pretending
    // otherwise would be a silent data-shape surprise.
    return continueWith(
      { items: [...inputItems], outputIndex: chosen, branch: chosen },
      {
        stepKind: step.kind,
        matchedRouting,
        fallback,
        outputIndex: chosen,
        routingCount: step.routings.length,
        itemCount: inputItems.length,
      },
    );
  }

  if (step.kind === 'split_out') {
    const result = applySplitOut(
      inputItems,
      step.path,
      step.includeOtherFields !== false,
      step.targetPath,
      nodeId,
    );
    return continueWith({ items: result.items }, result.detail);
  }

  // ---------------------------------------------------------------------------------------------
  // Combining nodes (W7b).
  //
  // The only node that consumes `branchItems`. The walker buffers a converging node's incoming
  // branches and calls here once, after every incoming edge has delivered or the walk has ended —
  // so this case never waits, and a branch that never ran is simply an empty array.
  // ---------------------------------------------------------------------------------------------
  if (step.kind === 'merge_items') {
    const branches = branchItems ?? [inputItems];
    const result = applyMergeItems(
      branches,
      step.mode,
      step.keyPath,
      step.includeUnpaired === true,
      nodeId,
    );
    return continueWith({ items: result.items }, result.detail);
  }

  // ---------------------------------------------------------------------------------------------
  // Pacing (W8b).
  //
  // `wait` does **not** sleep. Sleeping inside a node holds a request, a run row and a database
  // connection open for as long as the author asked for — three days in the useful case — and a
  // restart loses the run entirely. Instead the node reports the resume instant and passes its items
  // through; the platform clock picks the run up again. The consequence is that the *rest* of the
  // graph runs later, not that the graph runs in a different order, so a Wait behaves for the author
  // like a pause and for the operator like a scheduled continuation.
  // ---------------------------------------------------------------------------------------------
  if (step.kind === 'wait') {
    if (step.unit === 'seconds') {
      // Short waits are honoured **in-process**. Routing three seconds through a 60 s clock would
      // round it up to a minute, so the two units carry deliberately different guarantees: `seconds`
      // is exact but does not survive a restart, `minutes`+ is durable and accurate to one tick.
      await new Promise<void>((resolve) => setTimeout(resolve, step.amount * 1000));
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        amount: step.amount,
        unit: step.unit,
        waitedInProcess: true,
        resumedAt: new Date().toISOString(),
      });
    }
    const unitMs = step.unit === 'minutes' ? 60_000 : step.unit === 'hours' ? 3_600_000 : 86_400_000;
    const resumeAt = new Date(Date.now() + step.amount * unitMs).toISOString();
    // `suspend`, not `continue`: the walker stops here and the evaluator writes a resume row. The
    // node reports nothing as "done" because it is not done — the rest of the graph runs later.
    return {
      kind: 'suspend',
      resumeAt,
      output: passThroughItems(inputItems, nodeId),
      detail: {
        stepKind: step.kind,
        amount: step.amount,
        unit: step.unit,
        resumeAt,
        deferred: true,
      },
    };
  }

  if (step.kind === 'notify_users') {
    /**
     * Recipients are the union of the fixed list and the payload path.
     *
     * Union rather than "path wins": an author who picked a fallback recipient and *also* named a
     * payload field means "either", and the alternative — silently ignoring the picked list once a
     * path is set — turns a working node into one that reaches nobody the moment a payload field is
     * absent. Duplicates are collapsed so naming the same person twice does not double-notify.
     *
     * The fixed list has no per-item identity, so the first item is the template scope; a path
     * recipient uses the first matching item for template scope (same as the former payload-only node).
     */
    const userIds = new Set<number>(step.userIds);
    for (const item of inputItems) {
      const resolved = resolveLabWorkflowPayloadUserId(item.json, step.path ?? '', {
        allowSystemUser: true,
      });
      if (resolved != null) {
        userIds.add(resolved);
      }
    }
    // The template scope follows the first concrete recipient, so a payload-driven node renders the
    // row it is about rather than an unrelated first item.
    const pathRecipientItem =
      step.path?.trim() && inputItems.length
        ? inputItems.find(
            (item) =>
              resolveLabWorkflowPayloadUserId(item.json, step.path ?? '', { allowSystemUser: true }) !=
              null,
          )?.json
        : undefined;
    const scopeItem = pathRecipientItem ?? inputItems[0]?.json;
    const templateScope = {
      payload: envelope.payload,
      item: scopeItem,
    };
    const copy = workflowNotificationCopyForEvent(envelope, workflowName, step.message, scopeItem);
    const resolvedActions = resolveLabNotificationActionsForScope(step.actions, templateScope);
    const resolvedIds = [...userIds];

    if (options.dryRun === true) {
      // Show the message the user would receive. A preview that hides the copy is useless for the
      // most common question — "does this read right?" — so the dry run reports it in full.
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        ...(step.path?.trim() ? { path: step.path } : {}),
        recipients: resolvedIds.length,
        wouldNotifyUserIds: resolvedIds,
        ...(step.path?.trim() && resolvedIds.length === 0
          ? { unresolvedPath: `No lab user matches "${step.path}" in this payload.` }
          : {}),
        wouldSend: { title: copy.title, body: copy.body },
        ...(resolvedActions?.length ? { wouldIncludeActions: resolvedActions.length } : {}),
      });
    }
    const notifications: LabUserNotification[] = [];
    for (const userId of resolvedIds) {
      const n = await insertWorkflowNotification(userId, envelope.id, copy.title, copy.body, resolvedActions);
      if (n) {
        notifications.push(n);
      }
    }
    await fanOutNotifications(io, notifications);
    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      ...(step.path?.trim() ? { path: step.path } : {}),
      recipients: resolvedIds.length,
      delivered: notifications.length,
    });
  }

  if (step.kind === 'comms_system_dm_payload_user') {
    /*
     * The recipient may be a user id **or** an email, resolved per item.
     *
     * The payload usually comes from a third party, and third parties identify people by address far
     * more often than by our internal id — a DM node that only understood ids forced the author to
     * invent one inside the graph. `allowSystemUser` stays off: a DM from THE-LAB to THE-LAB is a
     * self-conversation that looks like a delivery in the run log.
     */
    if (options.dryRun === true) {
      const resolvable = inputItems
        .map((item) => resolveLabWorkflowPayloadUserId(item.json, step.path))
        .filter((id): id is number => id != null);
      const text = workflowCommsDmTextForEvent(envelope, step.text, inputItems[0]?.json);
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        path: step.path,
        resolved: resolvable.length,
        wouldDmUserIds: resolvable,
        // A preview that silently reports 0 recipients is the exact failure the author is trying to
        // diagnose ("I set the DM and nobody got one"), so name the reason instead of leaving them
        // to compare field spellings by eye.
        ...(resolvable.length === 0 && inputItems.length > 0
          ? {
              unresolvedPath:
                `No lab user matches "${step.path}". A user id, a numeric string or a user email are ` +
                'all accepted.',
            }
          : {}),
        wouldSend: { text },
      });
    }
    let resolved = 0;
    let delivered = 0;
    for (const item of inputItems) {
      const userId = resolveLabWorkflowPayloadUserId(item.json, step.path);
      if (userId == null) {
        continue;
      }
      resolved += 1;
      const text = workflowCommsDmTextForEvent(envelope, step.text, item.json);
      // Same guard as the in-app notification: a DM to a user id that no longer satisfies the
      // comms foreign keys must cost one message, not the run.
      try {
        const result = labCommsService.sendDmText(LAB_PLATFORM_SYSTEM_USER_ID, userId, text);
        if (result.success) {
          delivered += 1;
          broadcastLabCommsDmEnvelope(io, LAB_PLATFORM_SYSTEM_USER_ID, userId, result.envelope);
        }
      } catch (err) {
        console.warn('[lab-workflows] DM skipped — user not reachable', userId, err);
      }
    }
    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      path: step.path,
      resolved,
      delivered,
      ...(resolved === 0 && inputItems.length > 0
        ? { unresolvedPath: `No lab user matches "${step.path}".` }
        : {}),
    });
  }

  if (step.kind === 'publish_event') {
    if (options.dryRun === true) {
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        type: step.type,
        sourceAppId: step.sourceAppId,
        wouldPublishCount: inputItems.length,
      });
    }
    for (const item of inputItems) {
      const derived: LabDomainEventEnvelopeV1 = {
        schemaVersion: 1,
        id: randomUUID(),
        type: step.type,
        sourceAppId: step.sourceAppId,
        occurredAt: new Date().toISOString(),
        actorUserId: envelope.actorUserId,
        payload: { ...item.json, ...step.payloadMerge },
      };
      await publishLabDomainEventPipeline(derived, envelope.actorUserId, io);
    }
    return continueWith(passThroughItems(inputItems, nodeId));
  }

  if (step.kind === 'rule_ref') {
    const rule = labRulesRepository.getById(step.ruleId);
    if (!rule) {
      console.warn('[lab-workflows] rule_ref missing rule', step.ruleId);
      return abortWith(`rule_ref missing rule ${step.ruleId}`);
    }
    const { matches } = await labRulesService.ruleMatchesEvent(rule, envelope);
    return matches
      ? continueWith(passThroughItems(inputItems, nodeId))
      : abortWith('rule_ref did not match');
  }

  // ---------------------------------------------------------------------------------------------
  // Platform nodes (W9).
  //
  // These act on the lab itself. Every one of them can be described in a dry run, so unlike the pure
  // data nodes each has an explicit `dryRun` branch: an author checking "what would this delete?"
  // before turning a workflow on is the whole point of the preview.
  // ---------------------------------------------------------------------------------------------
  if (step.kind === 'lab_query_app') {
    const actor = resolveWorkflowIntegrationActorUser(envelope, null);
    if (!actor) {
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        skippedReason: 'no actor user',
      });
    }
    const read: Record<string, unknown>[] = [];
    let missing = 0;
    for (const item of inputItems) {
      const recordId = step.recordIdPath ? getPayloadValueAtPath(item.json, step.recordIdPath) : null;
      if (step.recordIdPath && recordId == null) {
        missing += 1;
        continue;
      }
      const record = await fetchIntegrationRecord(
        actor,
        step.providerAppId,
        step.serviceId,
        recordId as string | number,
      );
      if (record) {
        read.push(record);
      }
    }
    // A read node **replaces** its items with what it read: "look up the customer, then act on the
    // customer" is the point, and passing the original items through would mean the next node sees
    // an id it cannot use.
    return continueWith(
      { items: read.map((json, itemIndex) => ({ json, pairedItem: { nodeId, itemIndex } })) },
      {
        stepKind: step.kind,
        providerAppId: step.providerAppId,
        serviceId: step.serviceId,
        requested: inputItems.length,
        read: read.length,
        missingRecordId: missing,
      },
    );
  }

  if (step.kind === 'integration_delete') {
    if (options.dryRun === true) {
      const wouldDelete = inputItems
        .map((item) => getPayloadValueAtPath(item.json, step.recordIdPath))
        .filter((id) => id != null);
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        providerAppId: step.providerAppId,
        serviceId: step.serviceId,
        wouldDeleteCount: wouldDelete.length,
        wouldDeleteIds: wouldDelete.slice(0, 5),
      });
    }
    const actor = resolveWorkflowIntegrationActorUser(envelope, null);
    if (!actor) {
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        skippedReason: 'no actor user',
      });
    }
    let deleted = 0;
    let alreadyAbsent = 0;
    let missingId = 0;
    for (const item of inputItems) {
      const recordId = getPayloadValueAtPath(item.json, step.recordIdPath);
      if (recordId == null || typeof recordId === 'object') {
        // A missing id is counted, not thrown: a batch where one row has no id should delete the
        // rows that do and report the rest, rather than losing the whole node to one bad row.
        missingId += 1;
        continue;
      }
      const result = await deleteIntegrationRecord(
        actor,
        step.providerAppId,
        step.serviceId,
        recordId as string | number,
      );
      if (result.alreadyAbsent) {
        alreadyAbsent += 1;
      } else {
        deleted += 1;
      }
    }
    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      providerAppId: step.providerAppId,
      serviceId: step.serviceId,
      deleted,
      alreadyAbsent,
      missingRecordId: missingId,
    });
  }

  if (step.kind === 'raise_approval') {
    // The approval is raised **for the actor of the event**, because the requester is a fact the
    // approver needs: "who asked for this" cannot be reconstructed later if the workflow invents it.
    const actor = resolveWorkflowIntegrationActorUser(envelope, null);
    if (options.dryRun === true) {
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        policyId: step.policyId,
        title: step.title,
        actorResolved: actor != null,
        wouldRaiseCount: inputItems.length,
      });
    }
    if (!actor) {
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        skippedReason: 'no actor user',
      });
    }

    const raised: string[] = [];
    let failed = 0;
    for (const item of inputItems) {
      const subjectEntityId = step.subjectEntityIdPath
        ? getPayloadValueAtPath(item.json, step.subjectEntityIdPath)
        : undefined;
      const subjectEntityType = step.subjectEntityTypePath
        ? getPayloadValueAtPath(item.json, step.subjectEntityTypePath)
        : step.subjectEntityType;
      const titleRaw = step.titlePath
        ? getPayloadValueAtPath(item.json, step.titlePath)
        : undefined;
      const title =
        titleRaw == null || String(titleRaw).trim() === ''
          ? step.title
          : String(titleRaw).trim();
      const descriptionRaw = step.descriptionPath
        ? getPayloadValueAtPath(item.json, step.descriptionPath)
        : undefined;
      const description =
        descriptionRaw == null || String(descriptionRaw).trim() === ''
          ? step.description
          : String(descriptionRaw).trim();
      try {
        const request = await labApprovalsService.createRequestForCaller(
          actor,
          {
            id: randomUUID(),
            policyId: step.policyId,
            title,
            description,
            subjectAppId: step.subjectAppId,
            subjectEntityType:
              subjectEntityType == null ? undefined : String(subjectEntityType),
            subjectEntityId: subjectEntityId == null ? undefined : String(subjectEntityId),
          },
          io,
        );
        raised.push(request.id);
      } catch (err) {
        // One policy that no longer exists must not abort a batch: the remaining rows are still
        // valid requests, and the count is what tells the user some were refused.
        failed += 1;
        console.warn('[lab-workflows] raise_approval failed', step.policyId, err);
      }
    }
    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      policyId: step.policyId,
      requested: inputItems.length,
      raised: raised.length,
      failed,
      requestIds: raised.slice(0, 5),
    });
  }

  if (step.kind === 'virtual_bank_get_wallet') {
    const path = step.userIdPath?.trim() || 'userId';
    const outputs: LabWorkflowItem[] = [];
    let resolved = 0;
    let skipped = 0;
    const eligibilityPreview: LabVirtualBankDailyAllotmentEligibility[] = [];
    for (const item of inputItems) {
      const userId = resolveLabWorkflowPayloadUserId(item.json, path, { allowSystemUser: false })
        ?? (typeof getPayloadValueAtPath(item.json, path) === 'number'
          ? Math.trunc(getPayloadValueAtPath(item.json, path) as number)
          : null);
      const fallbackUserId =
        typeof envelope.payload.userId === 'number' ? Math.trunc(envelope.payload.userId) : null;
      const labUserId = userId ?? fallbackUserId ?? envelope.actorUserId ?? null;
      if (labUserId == null || labUserId <= 0) {
        skipped += 1;
        continue;
      }
      const eligibility = labVirtualBankRepository.evaluateDailyAllotmentEligibility(labUserId);
      resolved += 1;
      eligibilityPreview.push(eligibility);
      outputs.push({
        json: {
          ...item.json,
          userId: labUserId,
          balance: eligibility.balance,
          lastDailyAccrualDate: eligibility.lastDailyAccrualDate,
          dailyAccrualAmount: eligibility.dailyAccrualAmount,
          balanceCap: eligibility.balanceCap,
          dailyAllotmentEligible: eligibility.dailyAllotmentEligible,
          projectedAllotmentDelta: eligibility.projectedAllotmentDelta,
        },
      });
    }
    if (options.dryRun === true) {
      return continueWith(
        { items: outputs.length ? outputs : passThroughItems(inputItems, nodeId).items },
        {
          stepKind: step.kind,
          dryRun: true,
          path,
          resolved,
          skipped,
          wouldEnrich: eligibilityPreview.slice(0, 3),
        },
      );
    }
    return continueWith(
      { items: outputs.length ? outputs : passThroughItems(inputItems, nodeId).items },
      { stepKind: step.kind, path, resolved, skipped },
    );
  }

  if (step.kind === 'virtual_bank_credit_daily_allotment') {
    const path = step.userIdPath?.trim() || 'userId';
    const outputs: LabWorkflowItem[] = [];
    let credited = 0;
    let noOp = 0;
    let failed = 0;
    for (const item of inputItems) {
      const userId = resolveLabWorkflowPayloadUserId(item.json, path, { allowSystemUser: false })
        ?? (typeof getPayloadValueAtPath(item.json, path) === 'number'
          ? Math.trunc(getPayloadValueAtPath(item.json, path) as number)
          : null)
        ?? (typeof item.json.userId === 'number' ? Math.trunc(item.json.userId) : null);
      if (userId == null || userId <= 0) {
        failed += 1;
        continue;
      }
      if (options.dryRun === true) {
        const preview = labVirtualBankRepository.evaluateDailyAllotmentEligibility(userId);
        outputs.push({
          json: {
            ...item.json,
            userId,
            accrualApplied: preview.dailyAllotmentEligible,
            accrualDelta: preview.projectedAllotmentDelta,
            balanceAfter:
              preview.balance + (preview.dailyAllotmentEligible ? preview.projectedAllotmentDelta : 0),
          },
        });
        if (preview.dailyAllotmentEligible) {
          credited += 1;
        } else {
          noOp += 1;
        }
        continue;
      }
      try {
        const result = labVirtualBankRepository.applyDailyAllotmentAccrual(userId);
        const applied = result.accrualApplied;
        outputs.push({
          json: {
            ...item.json,
            userId,
            accrualApplied: Boolean(applied?.delta),
            accrualDelta: applied?.delta ?? 0,
            balanceAfter: result.account.balance,
            ledgerEntryId: result.ledgerEntryId,
          },
        });
        if (applied?.delta) {
          credited += 1;
        } else {
          noOp += 1;
        }
      } catch {
        failed += 1;
      }
    }
    return continueWith(
      { items: outputs.length ? outputs : passThroughItems(inputItems, nodeId).items },
      {
        stepKind: step.kind,
        ...(options.dryRun === true ? { dryRun: true } : {}),
        path,
        credited,
        noOp,
        failed,
      },
    );
  }

  if (step.kind === 'show_user_toast') {
    const path = step.userIdPath?.trim() || 'userId';
    const templateScope = (item: Record<string, unknown>) => ({
      payload: envelope.payload,
      item,
    });
    let delivered = 0;
    let skipped = 0;
    for (const item of inputItems) {
      const userId = resolveLabWorkflowPayloadUserId(item.json, path, { allowSystemUser: false })
        ?? (typeof getPayloadValueAtPath(item.json, path) === 'number'
          ? Math.trunc(getPayloadValueAtPath(item.json, path) as number)
          : null)
        ?? (typeof item.json.userId === 'number' ? Math.trunc(item.json.userId) : null);
      if (userId == null || userId <= 0) {
        skipped += 1;
        continue;
      }
      const summary = renderWorkflowMessageTemplate(step.summary, templateScope(item.json)).trim();
      const detail = step.detail
        ? renderWorkflowMessageTemplate(step.detail, templateScope(item.json)).trim()
        : undefined;
      if (options.dryRun === true) {
        delivered += 1;
        continue;
      }
      emitLabShellToastToUser(io, userId, {
        severity: step.severity,
        summary: summary || step.summary,
        detail,
        life: 6000,
      });
      delivered += 1;
    }
    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      ...(options.dryRun === true ? { dryRun: true } : {}),
      path,
      delivered,
      skipped,
      ...(options.dryRun === true
        ? {
            wouldToast: {
              severity: step.severity,
              summary: step.summary,
              detail: step.detail,
            },
          }
        : {}),
    });
  }

  if (step.kind === 'ledger_post_entry') {
    // Money. The confirmation is a **schema requirement**, so this branch cannot be reached without
    // one; the check is repeated here because a graph can be evaluated from a stored definition that
    // predates the schema change, and posting an unconfirmed entry is not a recoverable mistake.
    if (!Number.isInteger(step.confirmedByUserId) || step.confirmedByUserId <= 0) {
      return abortWith('ledger entry requires a confirming user');
    }
    // A non-numeric amount becomes `0`, not `NaN`. `NaN` propagates through every later sum, so a
    // single mis-mapped path would make the preview report `NaN` totals and the post fail with a
    // message about balance — hiding the actual problem, which is the path.
    const amountFrom = (json: Record<string, unknown>, path: string): number => {
      const raw = getPayloadValueAtPath(json, path);
      const parsed = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const lines = inputItems.flatMap((item) =>
      step.lines.map((line) => ({
        accountId: line.accountId,
        side: line.side,
        amountCents: amountFrom(item.json, line.amountCentsPath),
      })),
    );
    if (options.dryRun === true) {
      const primaryItem = inputItems[0]?.json ?? {};
      const memoRaw = step.memoPath
        ? getPayloadValueAtPath(primaryItem, step.memoPath)
        : undefined;
      const wouldPostMemo =
        memoRaw == null || String(memoRaw).trim() === ''
          ? step.memo
          : String(memoRaw).trim().slice(0, 500);
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        confirmedByUserId: step.confirmedByUserId,
        wouldPostMemo,
        wouldPostLines: lines.length,
        wouldPostEntries: inputItems.length,
        // Reporting the imbalance before it is posted is the useful preview: it is the mistake a
        // user cannot see by reading the graph.
        debitTotal: lines.filter((line) => line.side === 'debit').reduce((sum, line) => sum + line.amountCents, 0),
        creditTotal: lines.filter((line) => line.side === 'credit').reduce((sum, line) => sum + line.amountCents, 0),
      });
    }
    const poster = userService.getUserById(step.confirmedByUserId);
    if (!poster) {
      return abortWith(`ledger confirming user ${step.confirmedByUserId} does not exist`);
    }
    const primaryItem = inputItems[0]?.json ?? {};
    const memoRaw = step.memoPath
      ? getPayloadValueAtPath(primaryItem, step.memoPath)
      : undefined;
    const entryMemo =
      memoRaw == null || String(memoRaw).trim() === ''
        ? step.memo
        : String(memoRaw).trim().slice(0, 500);
    const entry = await labLedgerService.postEntryForCaller(
      poster,
      {
        id: randomUUID(),
        memo: entryMemo,
        occurredAt: new Date().toISOString(),
        lines,
      },
      io,
    );
    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      entryId: entry.id,
      lineCount: entry.lines.length,
      confirmedByUserId: step.confirmedByUserId,
    });
  }

  if (step.kind === 'integration_create' || step.kind === 'integration_update') {
    if (options.dryRun === true) {
      // A provider write is the highest-risk side effect: it changes another app's data. The dry
      // run reports the exact body that would be sent so the author can check field mapping first.
      const wouldWrite = inputItems.map((item) =>
        mergeIntegrationBodyFromPayload(item.json, step.bodyFromPayload, step.body),
      );
      const actor = resolveWorkflowIntegrationActorUser(envelope, null);
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        providerAppId: step.providerAppId,
        serviceId: step.serviceId,
        actorResolved: actor != null,
        wouldWriteCount: wouldWrite.length,
        wouldWrite: wouldWrite.slice(0, 5),
      });
    }
    const actor = resolveWorkflowIntegrationActorUser(envelope, null);
    if (!actor) {
      console.warn('[lab-workflows] integration step skipped — no actor user');
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        skippedReason: 'no actor user',
      });
    }

    // These calls cross a network boundary to a catalog app server, which is exactly the kind of
    // failure that is worth retrying: the app may still be starting, or a write may have hit a busy
    // database. Read-only nodes elsewhere are not wrapped because repeating them achieves nothing.
    const ledger = labWorkflowIdempotencyLedger;
    let written = 0;
    let duplicateKeys = 0;
    let failed = 0;

    for (const item of inputItems) {
      const body = mergeIntegrationBodyFromPayload(item.json, step.bodyFromPayload, step.body);
      const key = resolveIdempotencyKey(policy, envelope, item);
      if (key && ledger.has(key)) {
        duplicateKeys += 1;
        continue;
      }

      const recordId =
        step.kind === 'integration_update'
          ? resolveRecordIdFromPayload(item.json, step.recordIdPath)
          : null;
      if (step.kind === 'integration_update' && recordId == null) {
        console.warn(
          '[lab-workflows] integration_update skipped — record id missing',
          step.recordIdPath,
        );
        continue;
      }

      const result = await executeNodeWithPolicy({
        policy,
        envelope,
        items: inputItems,
        nodeId,
        run: async () => {
          if (step.kind === 'integration_create') {
            return createIntegrationRecord(actor, step.providerAppId, step.serviceId, body);
          }
          return updateIntegrationRecord(
            actor,
            step.providerAppId,
            step.serviceId,
            recordId as string | number,
            body,
          );
        },
      });

      if (!result.ok) {
        failed += 1;
        console.error(
          '[lab-workflows] integration step failed',
          step.kind,
          step.serviceId,
          result.failure.message,
        );
        continue;
      }
      written += 1;
      // Remember the key only after the write succeeded. Recording it before would suppress the
      // retry that exists to recover from exactly this kind of failure.
      if (key) {
        ledger.remember(key);
      }
    }

    if (failed > 0) {
      return abortWith(
        `integration_${step.kind === 'integration_create' ? 'create' : 'update'} failed for ${failed} of ${inputItems.length} item(s)`,
      );
    }

    return continueWith(passThroughItems(inputItems, nodeId), {
      stepKind: step.kind,
      providerAppId: step.providerAppId,
      serviceId: step.serviceId,
      written,
      duplicateKeys,
    });
  }

  if (step.kind === 'http_request') {
    // The URL may be templated from the payload, so it is resolved **per item** and validated per
    // item. Validating once at save time would pass a template and enforce nothing.
    const templateScopeFor = (item: LabWorkflowItem) => ({
      payload: envelope.payload,
      item: item.json,
    });
    const renderedFor = (item: LabWorkflowItem): string =>
      renderWorkflowMessageTemplate(step.url, templateScopeFor(item));
    const jsonBodyFor = (item: LabWorkflowItem): Record<string, unknown> | undefined => {
      if (step.method === 'GET' || step.method === 'DELETE') {
        return undefined;
      }
      const merged = mergeIntegrationBodyFromPayload(item.json, step.bodyFromPayload, step.body);
      const rendered = renderWorkflowJsonTemplates(merged, templateScopeFor(item)) as Record<
        string,
        unknown
      >;
      return Object.keys(rendered).length ? rendered : undefined;
    };

    if (options.dryRun === true) {
      const previews = inputItems.map((item) => {
        const rendered = renderedFor(item);
        const verdict = validateOutboundUrl(rendered, { allowList: step.allowList });
        const body = jsonBodyFor(item);
        return {
          url: rendered,
          allowed: verdict.ok,
          rejection: verdict.rejection ?? null,
          body: body ?? null,
        };
      });
      return continueWith(passThroughItems(inputItems, nodeId), {
        stepKind: step.kind,
        dryRun: true,
        method: step.method,
        // The most useful part of this preview: which of the URLs the author is about to call are
        // refused, and why. A node that would be blocked at run time must say so before it is enabled.
        wouldCallCount: previews.filter((preview) => preview.allowed).length,
        blockedCount: previews.filter((preview) => !preview.allowed).length,
        previews: previews.slice(0, 5),
      });
    }

    const responses: LabWorkflowItem[] = [];
    let blocked = 0;
    let failed = 0;
    let timedOut = 0;

    for (const [itemIndex, item] of inputItems.entries()) {
      const rendered = renderedFor(item);
      const verdict = validateOutboundUrl(rendered, { allowList: step.allowList });
      if (!verdict.ok || !verdict.url) {
        // Refused, not attempted. Counted so the run panel can explain a node that "did nothing".
        blocked += 1;
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), step.timeoutMs ?? 10_000);
      try {
        const response = await fetchOutbound({
          url: verdict.url,
          method: step.method,
          headers: renderHeaderMap(step.headers, envelope.payload, item.json),
          body: (() => {
            const body = jsonBodyFor(item);
            return body ? JSON.stringify(body) : undefined;
          })(),
          signal: controller.signal,
          allowList: step.allowList,
        });
        if (!response.ok) {
          failed += 1;
          continue;
        }
        const text = await response.text();
        // Truncated rather than rejected: needing the first field of a large document is the common
        // case, and failing outright would make the node useless against verbose APIs.
        const capped = text.length > LAB_WORKFLOW_HTTP_MAX_RESPONSE_BYTES
          ? text.slice(0, LAB_WORKFLOW_HTTP_MAX_RESPONSE_BYTES)
          : text;
        let parsed: unknown = capped;
        try {
          parsed = JSON.parse(capped) as unknown;
        } catch {
          // Not JSON: keep the text. An HTML or CSV response is legitimate.
        }
        responses.push({
          json: { ...item.json, response: parsed, status: response.status },
          pairedItem: { nodeId, itemIndex },
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          timedOut += 1;
        } else {
          failed += 1;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return continueWith(
      {
        // `replaceItems` is opt-in because replacing is destructive: the caller's own fields vanish
        // and every later `path` would resolve against the response instead.
        items: step.replaceItems === true
          ? responses.map((row) => ({
              json: (row.json.response ?? {}) as Record<string, unknown>,
              pairedItem: row.pairedItem,
            }))
          : responses,
      },
      {
        stepKind: step.kind,
        method: step.method,
        requested: inputItems.length,
        succeeded: responses.length,
        blocked,
        failed,
        timedOut,
        replacedItems: step.replaceItems === true,
      },
    );
  }

  // Unknown step kind: pass items through rather than dropping them.
  return continueWith(emptyOutputOrPass(inputItems, nodeId));
}

/**
 * Render a header map with payload references.
 *
 * Values support `{{payload.x}}`; header **names** do not, because a name that changes per item would
 * make the request shape unpredictable and is never something an author means.
 */
function renderHeaderMap(
  headers: Record<string, string> | undefined,
  envelopePayload: Record<string, unknown>,
  itemJson: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    out[name] = renderWorkflowMessageTemplate(value, { payload: envelopePayload, item: itemJson });
  }
  return out;
}

function emptyOutputOrPass(
  items: readonly LabWorkflowItem[],
  nodeId: string,
): LabWorkflowNodeOutput {
  return items.length > 0 ? passThroughItems(items, nodeId) : emptyOutput();
}
