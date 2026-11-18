import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowScope } from '@/shared/types/lab-workflow';
import type { LabWorkflowItem, LabWorkflowNodeOutput } from '@/shared/types/lab-workflow-items';
import { workflowGraphRuleNodeMatches } from './lab-workflow-graph-rule-runtime';
import { labWorkflowRuleNodeIsConfigured } from '@/shared/utils/lab-workflow-graph-rule-record';
import { normalizeWorkflowGroupNode } from '@/shared/utils/lab-workflow-graph-group-normalize';
import { orderWorkflowGroupMembers } from '@/shared/utils/lab-workflow-graph-group-order';
import { labWorkflowGraphGroupMemberNodes } from '@/shared/utils/lab-workflow-graph-group';
import type { EvaluateWorkflowsOptions } from './lab-workflows-evaluator';
import { runWorkflowStep, type WorkflowStepOutcome } from './lab-workflow-step-runner';
import { classifyStepStatus } from './lab-workflow-run-recorder';
import { emitWorkflowRunStep } from './lab-workflow-run-stream';

/**
 * Narrate one node from inside the group runtime.
 *
 * The graph walker calls `streamNode` for the nodes it enters, but **members are executed here**, not by
 * the walker, and `runActionGroup` is invoked *after* the walker already streamed the group as
 * succeeded. So without this the canvas never heard about any member and they stayed untinted while
 * the run list — which reads recorded steps, not the stream — showed them all as done.
 *
 * `seq` continues from the walker's counter via `options.run`, so ordering over the socket stays
 * monotonic: a member's transition can never be applied before the group's own `running`.
 */
function streamGroupNode(
  options: EvaluateWorkflowsOptions,
  workflowId: string,
  nodeId: string,
  nodeKind: string,
  status: 'running' | 'succeeded' | 'failed' | 'skipped',
  seq: number,
): void {
  if (!options.streamUserId) {
    return;
  }
  emitWorkflowRunStep(options.io, options.streamUserId, {
    runId: options.run?.id ?? null,
    workflowId,
    nodeId,
    nodeKind,
    status,
    seq,
  });
}

/**
 * Run an action group's members and return what the group hands downstream.
 *
 * **Item flow inside a group**, decided here rather than left to the walk order:
 *
 * - A **sequential** group is a chain: each member is fed the previous member's output, because that
 *   is the only reading under which two transforms in a group compose.
 * - A **parallel** group is a fan-out: every member sees the *same* input, because a member has no
 *   defined "previous" and feeding one member's output to another would make the result depend on
 *   declaration order.
 * - The group's own output is the **last member's** output in sequential mode, and the **union** of
 *   member outputs in parallel mode (last member wins a tie on empty output, so an all-no-op group
 *   still passes its input rather than silently emptying it).
 */
export async function executeActionGroupMembers(
  definition: LabWorkflowDefinitionV2,
  group: Extract<LabWorkflowGraphNodeV2, { kind: 'group' }>,
  envelope: LabDomainEventEnvelopeV1,
  workflowName: string,
  options: EvaluateWorkflowsOptions,
  inputItems: readonly LabWorkflowItem[],
  /** Needed only to stamp stream events; the run id alone is not enough for the canvas to route them. */
  workflowId = '',
): Promise<LabWorkflowNodeOutput> {
  const config = normalizeWorkflowGroupNode(group);
  if (config.groupType !== 'actions') {
    return { items: [...inputItems] };
  }
  const members = labWorkflowGraphGroupMemberNodes(definition, group.id, 'action').filter(
    (node): node is Extract<LabWorkflowGraphNodeV2, { kind: 'action' }> => node.kind === 'action',
  );
  if (!members.length) {
    return { items: [...inputItems] };
  }
  const ordered = orderWorkflowGroupMembers(definition, group.id, members);

  /**
   * Group members execute here rather than in the graph walker, so this is the only place that can
   * record them. Parallel groups settle all members, which would otherwise make a run look like it
   * executed fewer nodes than it did.
   */
  /*
   * `seq` only has to be monotonic per run, and the client queues in arrival order — so a simple
   * counter continuing from the member ordinal is enough. `streamGroupNode` is called in exactly the
   * order members execute, which is what the canvas replays.
   */
  let memberSeq = 0;
  const streamMember = (
    nodeId: string,
    status: 'running' | 'succeeded' | 'failed' | 'skipped',
  ): void => {
    memberSeq += 1;
    streamGroupNode(options, workflowId, nodeId, 'action', status, memberSeq);
  };

  const runOne = async (
    action: Extract<LabWorkflowGraphNodeV2, { kind: 'action' }>,
    memberItems: readonly LabWorkflowItem[],
  ): Promise<WorkflowStepOutcome> => {
    const startedAt = Date.now();
    streamMember(action.id, 'running');
    try {
      const outcome = await runWorkflowStep({
        step: action.step,
        envelope,
        items: memberItems,
        workflowName,
        nodeId: action.id,
        policy: action,
        options,
      });
      streamMember(action.id, outcome.kind === 'abort' ? 'failed' : 'succeeded');
      options.run?.recordStep({
        nodeId: action.id,
        nodeKind: action.kind,
        status: outcome.kind === 'abort' ? classifyStepStatus(outcome.reason) : 'succeeded',
        itemsInCount: memberItems.length,
        itemsOutCount: outcome.kind === 'continue' ? outcome.output.items.length : 0,
        durationMs: Date.now() - startedAt,
        detail: {
          ...(outcome.kind === 'continue' && outcome.detail ? outcome.detail : { stepKind: action.step.kind }),
          groupId: group.id,
          executionMode: config.executionMode,
        },
        error: outcome.kind === 'abort' ? outcome.reason : null,
      });
      return outcome;
    } catch (err) {
      streamMember(action.id, 'failed');
      options.run?.recordStep({
        nodeId: action.id,
        nodeKind: action.kind,
        status: 'failed',
        itemsInCount: memberItems.length,
        itemsOutCount: 0,
        durationMs: Date.now() - startedAt,
        detail: { stepKind: action.step.kind, groupId: group.id, executionMode: config.executionMode },
        error: err instanceof Error ? err.message : 'step threw',
      });
      throw err;
    }
  };

  if (config.executionMode === 'parallel') {
    const results = await Promise.all(
      ordered.map(async (action) => {
        try {
          return await runOne(action, inputItems);
        } catch (err) {
          return {
            kind: 'abort',
            reason: err instanceof Error ? err.message : 'step threw',
          } as WorkflowStepOutcome;
        }
      }),
    );
    const aborted = results.some((outcome) => outcome.kind === 'abort');
    if (config.failurePolicy === 'stop' && aborted) {
      return { items: [...inputItems] };
    }
    // Union of member outputs. A no-op member returns its input, so an all-side-effect group still
    // hands its items on rather than emptying the chain.
    const union: LabWorkflowItem[] = [];
    for (const outcome of results) {
      if (outcome.kind === 'continue') {
        union.push(...outcome.output.items);
      }
    }
    return { items: union.length > 0 ? union : [...inputItems] };
  }

  let groupItems: readonly LabWorkflowItem[] = inputItems;
  for (const action of ordered) {
    let outcome: WorkflowStepOutcome = { kind: 'abort', reason: 'not run' };
    try {
      outcome = await runOne(action, groupItems);
    } catch (err) {
      outcome = { kind: 'abort', reason: err instanceof Error ? err.message : 'step threw' };
    }
    if (outcome.kind === 'continue') {
      groupItems = outcome.output.items;
      continue;
    }
    if (config.failurePolicy === 'stop') {
      return { items: [...groupItems] };
    }
  }
  return { items: [...groupItems] };
}

export async function evaluateRuleGroupMembers(
  definition: LabWorkflowDefinitionV2,
  group: Extract<LabWorkflowGraphNodeV2, { kind: 'group' }>,
  envelope: LabDomainEventEnvelopeV1,
  workflowScope: LabWorkflowScope,
  ownerUserId: number | null,
): Promise<boolean> {
  const config = normalizeWorkflowGroupNode(group);
  if (config.groupType !== 'rules') {
    return false;
  }
  const members = labWorkflowGraphGroupMemberNodes(definition, group.id, 'rule').filter(
    (node): node is Extract<LabWorkflowGraphNodeV2, { kind: 'rule' }> =>
      node.kind === 'rule' && labWorkflowRuleNodeIsConfigured(node),
  );
  if (!members.length) {
    return false;
  }
  const ordered = orderWorkflowGroupMembers(definition, group.id, members);

  const matchForMember = async (
    member: Extract<LabWorkflowGraphNodeV2, { kind: 'rule' }>,
  ): Promise<boolean> =>
    workflowGraphRuleNodeMatches(member, definition, envelope, workflowScope, ownerUserId);

  if (config.ruleCombine === 'sequential_first_match') {
    for (const member of ordered) {
      if (await matchForMember(member)) {
        return true;
      }
    }
    return false;
  }

  if (config.ruleCombine === 'any_match') {
    for (const member of ordered) {
      if (await matchForMember(member)) {
        return true;
      }
    }
    return false;
  }

  for (const member of ordered) {
    if (!(await matchForMember(member))) {
      return false;
    }
  }
  return true;
}

export function isGroupMemberNode(
  definition: LabWorkflowDefinitionV2,
  groupId: string,
  nodeId: string,
): boolean {
  const node = definition.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return false;
  }
  return (node.kind === 'action' || node.kind === 'rule') && node.groupId === groupId;
}
