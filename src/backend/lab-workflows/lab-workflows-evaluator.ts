import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowRecord } from '@/shared/types/lab-workflow';
import { labWorkflowsService } from '../db/LabWorkflows/lab-workflows-service';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import { singleItemOutput, type LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import { evaluateWorkflowGraphForDomainEvent } from './lab-workflow-graph-evaluator';
import { runWorkflowStep, type WorkflowStepOutcome } from './lab-workflow-step-runner';
import {
  beginWorkflowRun,
  classifyStepStatus,
  type WorkflowRunHandle,
} from './lab-workflow-run-recorder';
import type { Server as SocketIOServer } from 'socket.io';
import { LabEventsService } from '../db/LabEvents/lab-events-service';
import { prepareWorkflowRequiredApps } from './lab-workflow-required-apps-runtime';

export type { WorkflowStepOutcome };

export interface EvaluateWorkflowsOptions {
  io?: SocketIOServer;
  /**
   * Recipient for per-node run stream events, or `null` when nobody is watching a canvas.
   *
   * Set only for a manual designer run; scheduler / webhook / event-triggered runs leave it unset.
   */
  streamUserId?: number | null;
  /** Workflow being narrated. Only read when `streamUserId` is set. */
  streamWorkflowId?: string | null;
  fromWorkflowEngine?: boolean;
  /**
   * Open execution record (W1). Threaded through the evaluator so every node reports into one run
   * rather than each node opening its own. `null` means "record nothing" — a dry run or a path that
   * must not pollute the history.
   */
  run?: WorkflowRunHandle | null;
  /**
   * Called when a `wait` node suspends the graph (phase 36).
   *
   * A callback rather than the evaluator writing the resume row itself: the evaluator has no
   * database access by design (it is unit-testable without one), and the caller is the only place
   * that knows the workflow id needed by the row.
   *
   * Absent means "nobody can resume this run" — the graph simply stops at the wait, which is what a
   * dry run wants.
   */
  onSuspend?: (suspend: {
    nodeId: string;
    items: readonly import('@/shared/types/lab-workflow-items').LabWorkflowItem[];
    resumeAt: string;
  }) => void;
  /**
   * Evaluate without side effects (W5a).
   *
   * "Would this work?" must be answerable without notifying a real person, publishing a real event,
   * or writing to a provider app. Each side-effecting node reports what it *would* have done and
   * skips the call, so the dry run is a faithful description of the real run rather than a different
   * code path that can drift from it.
   *
   * The flag is threaded from the route rather than inferred from `run === null`, because a null run
   * handle also means "do not record" — which is not the same as "do not act".
   */
  dryRun?: boolean;
}

export async function evaluateWorkflowsForDomainEvent(
  envelope: LabDomainEventEnvelopeV1,
  options: EvaluateWorkflowsOptions,
): Promise<void> {
  if (options.fromWorkflowEngine === true) {
    return;
  }

  const workflows = labWorkflowsService.listEnabledForEvaluation(envelope.actorUserId);
  for (const workflow of workflows) {
    const { matches } = await labWorkflowsService.workflowMatchesEvent(workflow, envelope);
    if (!matches) {
      continue;
    }

    // One run per workflow that actually reacts. A workflow whose trigger does not match leaves no
    // run at all — otherwise the run history fills with rows for every event in the lab.
    const run = options.run === null
      ? null
      : beginWorkflowRun({ workflowId: workflow.id, triggerType: 'event', envelope });
    const scoped: EvaluateWorkflowsOptions = { ...options, run };
    const definition = workflow.definition;

    if (!options.dryRun) {
      const catalog = LabEventsService.getInstance().getEventCatalog().entries;
      const actorUserId = envelope.actorUserId ?? 0;
      const prepared = await prepareWorkflowRequiredApps(definition, catalog, actorUserId);
      if (!prepared.allLaunchableReady) {
        console.warn(
          '[lab-workflows] skipped workflow — required apps not ready',
          workflow.id,
          prepared.message ?? '',
        );
        run?.finish('failed', prepared.message ?? 'Required catalog apps are not running');
        continue;
      }
    }

    try {
      if (isLabWorkflowDefinitionV2(definition)) {
        await evaluateWorkflowGraphForDomainEvent(
          definition,
          envelope,
          workflow.name,
          workflow.scope,
          workflow.ownerUserId,
          scoped,
        );
      } else {
        await runLegacySteps(definition.steps, envelope, workflow.name, scoped);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'workflow execution threw';
      console.error('[lab-workflows] execution failed', workflow.id, err);
      run?.finish('failed', message);
      continue;
    }

    run?.finish();
  }
}

/**
 * V1 definitions are a flat list of steps with no graph, so the evaluator is the only place that
 * knows a step's position. Recording here keeps V1 workflows observable even though they cannot
 * express branching yet.
 */
async function runLegacySteps(
  steps: Extract<LabWorkflowRecord['definition'], { schemaVersion: 1 }>['steps'],
  envelope: LabDomainEventEnvelopeV1,
  workflowName: string,
  options: EvaluateWorkflowsOptions,
): Promise<void> {
  // V1 steps are a chain too: each step consumes the previous step's items. Resetting to the
  // envelope payload every iteration made "step 2 reads a field step 1 wrote" impossible.
  let stepItems: readonly LabWorkflowItem[] = singleItemOutput(envelope.payload, 'trigger').items;
  for (const [index, step] of steps.entries()) {
    const nodeId = `step-${index + 1}`;
    const startedAt = Date.now();
    try {
      const outcome = await runWorkflowStep({
        step,
        envelope,
        items: stepItems,
        workflowName,
        nodeId,
        options,
      });
      options.run?.recordStep({
        nodeId,
        nodeKind: step.kind,
        status: outcome.kind === 'abort' ? classifyStepStatus(outcome.reason) : 'succeeded',
        itemsInCount: stepItems.length,
        itemsOutCount: outcome.kind === 'continue' ? outcome.output.items.length : 0,
        durationMs: Date.now() - startedAt,
        error: outcome.kind === 'abort' ? outcome.reason : null,
      });
      if (outcome.kind === 'abort') {
        return;
      }
      stepItems = outcome.output.items;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'step threw';
      console.error('[lab-workflows] step failed', workflowName, err);
      options.run?.recordStep({
        nodeId,
        nodeKind: step.kind,
        status: 'failed',
        itemsInCount: stepItems.length,
        itemsOutCount: 0,
        durationMs: Date.now() - startedAt,
        error: message,
      });
      return;
    }
  }
}
