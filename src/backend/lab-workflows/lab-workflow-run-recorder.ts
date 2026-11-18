import { randomUUID } from 'node:crypto';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type {
  LabWorkflowRunStatus,
  LabWorkflowRunStepStatus,
  LabWorkflowTriggerType,
} from '@/shared/types/lab-workflow-run';
import { labWorkflowRunsRepository } from '../db/LabWorkflows/lab-workflow-runs-repository';
import { publishLabDomainEventPipeline } from '../lab-events/publish-lab-domain-event-pipeline';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';

/**
 * Records what a workflow execution actually did.
 *
 * ## Why this is a separate module from the repository
 *
 * The repository speaks SQL; the recorder speaks *workflow*. The evaluator must not care that
 * `seq` is 1-based or that a non-matching rule should be `skipped` rather than `failed` — those are
 * recording policy, and W2/W5 extend them (retries, manual runs). Keeping policy here means the
 * evaluator only calls `recordStep()`.
 *
 * ## Status rules
 *
 * A step is `failed` only when the node genuinely errored. A node that declined to act — a
 * `rule_ref` that did not match — is `skipped`, because reporting it as a failure would make every
 * correctly-declining workflow look broken in the run panel.
 *
 * A run is `succeeded` when every attempted step succeeded, `partial` when some steps were skipped
 * and none failed, `failed` when any step failed, and `skipped` when nothing executed at all.
 */

const NON_FAILURE_ABORT_REASONS = new Set([
  'rule_ref did not match',
]);

/**
 * Node kinds that decide rather than act.
 *
 * A run whose only rows are these did no work: the trigger fired and the graph declined. Calling
 * that `partial` would suggest something happened, so `deriveStatus` reports `skipped` instead.
 * `rule_ref` is here because it is a V1 rule in step's clothing.
 */
const NON_WORK_NODE_KINDS = new Set(['trigger', 'condition', 'rule', 'group', 'rule_ref']);

/** Map a step-runner abort reason onto a step status that a human can act on. */
export function classifyStepStatus(reason: string): LabWorkflowRunStepStatus {
  return NON_FAILURE_ABORT_REASONS.has(reason) ? 'skipped' : 'failed';
}

export interface BeginRunParams {
  workflowId: string;
  triggerType: LabWorkflowTriggerType;
  envelope?: LabDomainEventEnvelopeV1 | null;
  eventId?: string | null;
  /** The saved sample this run replayed (W5b), if any. */
  mockSampleId?: string | null;
  /**
   * Continue an existing run row instead of opening a new one (phase 36).
   *
   * A resumed `wait` is the **same** execution continuing, so the history must read as one run that
   * paused rather than two runs that each did half the work. When set, no insert happens and the
   * handle appends steps to the given run.
   */
  existingRunId?: string;
}

export interface WorkflowRunHandle {
  readonly id: string;
  readonly workflowId: string;
  /** Append one executed node. Never throws — recording must not break the workflow. */
  recordStep(params: {
    nodeId: string;
    nodeKind: string;
    status: LabWorkflowRunStepStatus;
    itemsInCount: number;
    itemsOutCount: number;
    durationMs?: number | null;
    detail?: Record<string, unknown> | null;
    error?: string | null;
  }): void;
  /** Close the run, deriving the status from what was recorded unless one is given. */
  finish(status?: LabWorkflowRunStatus, error?: string | null): void;
}

function deriveStatus(counts: {
  succeededWork: number;
  skippedWork: number;
  failed: number;
  decidedOnly: number;
  rows: number;
}): LabWorkflowRunStatus {
  const { succeededWork, skippedWork, failed, decidedOnly, rows } = counts;
  if (failed > 0) {
    return 'failed';
  }
  if (rows === 0) {
    return 'skipped';
  }
  // Only decision nodes ran — the graph declined. No work was attempted, so nothing "partially"
  // happened either.
  if (succeededWork === 0 && skippedWork === 0 && decidedOnly > 0) {
    return 'skipped';
  }
  if (skippedWork > 0) {
    return succeededWork > 0 ? 'partial' : 'skipped';
  }
  return 'succeeded';
}

/**
 * Open a run.
 *
 * Returns a handle even if the database is unavailable, so a workflow in a test that has not
 * bootstrapped the run tables still executes. Recording is diagnostic; it must never be the reason
 * a notification does not get sent.
 */
export function beginWorkflowRun(params: BeginRunParams): WorkflowRunHandle {
  const id = params.existingRunId ?? randomUUID();
  const startedAt = new Date().toISOString();
  let seq = 0;
  let rows = 0;
  let succeededWork = 0;
  let skippedWork = 0;
  let decidedOnly = 0;
  let failed = 0;
  let closed = false;

  // A resumed run reuses its existing row: inserting again would fail on the primary key and, worse,
  // would reset `started_at` so the history claimed the run began when it resumed.
  if (!params.existingRunId) {
    try {
      labWorkflowRunsRepository.startRun({
        id,
        workflowId: params.workflowId,
        triggerType: params.triggerType,
        eventId: params.eventId ?? params.envelope?.id ?? null,
        envelope: params.envelope ?? null,
        mockSampleId: params.mockSampleId ?? null,
        startedAt,
      });
    } catch (err) {
      console.warn('[lab-workflows] could not open run record', params.workflowId, err);
    }
  }

  return {
    id,
    workflowId: params.workflowId,
    recordStep(step) {
      if (closed) {
        return;
      }
      seq += 1;
      rows += 1;
      const isWork = !NON_WORK_NODE_KINDS.has(step.nodeKind);
      if (step.status === 'failed') failed += 1;
      else if (!isWork) decidedOnly += 1;
      else if (step.status === 'succeeded') succeededWork += 1;
      else skippedWork += 1;
      try {
        labWorkflowRunsRepository.recordStep({
          runId: id,
          seq,
          nodeId: step.nodeId,
          nodeKind: step.nodeKind,
          status: step.status,
          itemsInCount: step.itemsInCount,
          itemsOutCount: step.itemsOutCount,
          durationMs: step.durationMs ?? null,
          detail: step.detail ?? null,
          error: step.error ?? null,
        });
      } catch (err) {
        console.warn('[lab-workflows] could not record run step', id, step.nodeId, err);
      }
    },
    finish(status, error) {
      if (closed) {
        return;
      }
      closed = true;
      let derivedStatus: LabWorkflowRunStatus = 'succeeded';
      try {
        derivedStatus = status
          ?? deriveStatus({ succeededWork, skippedWork, failed, decidedOnly, rows });
        labWorkflowRunsRepository.finishRun({
          runId: id,
          status: derivedStatus,
          error: error ?? null,
          finishedAt: new Date().toISOString(),
        });
        labWorkflowRunsRepository.pruneRunsForWorkflow(params.workflowId);
      } catch (err) {
        console.warn('[lab-workflows] could not close run record', id, err);
      }

      // The error trigger (W11): a failed run becomes an event another workflow can match.
      //
      // Published **after** the run row is closed, so a workflow reacting to the failure reads a
      // history where the failure already exists. Publishing before would let a notification arrive
      // before the run panel could show the run it is about.
      //
      // Deliberately fire-and-forget: publishing is a second side effect that can itself fail, and a
      // failure there must not turn a recorded run into an unrecorded one. It also means a workflow
      // that fails *and* is itself subscribed to `workflow.run.failed` cannot deadlock — the publish
      // does not wait for its subscribers.
      if (derivedStatus === 'failed') {
        void publishWorkflowRunFailed(id, params.workflowId, params.triggerType, error ?? null);
      }
    },
  };
}

/**
 * Event type a failed run publishes (W11, T16).
 *
 * Matched by an "error workflow" whose trigger names this type. Kept in `shared` so the catalog and
 * the recorder cannot drift apart: a typo here would make every error workflow silently dead, with no
 * symptom except "the alert never came".
 */
export const LAB_WORKFLOW_RUN_FAILED_EVENT_TYPE = 'platform-workflows.run.failed';

/**
 * Publish the failure event. Never throws.
 *
 * Every field is something an error workflow needs to *do* anything useful: which workflow, which run,
 * what the error was, and which trigger kind produced it — because "the nightly job failed" and "a
 * user's manual run failed" warrant different responses.
 */
async function publishWorkflowRunFailed(
  runId: string,
  workflowId: string,
  triggerType: LabWorkflowTriggerType,
  error: string | null,
): Promise<void> {
  try {
    const envelope: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: LAB_WORKFLOW_RUN_FAILED_EVENT_TYPE,
      sourceAppId: 'platform-workflows',
      occurredAt: new Date().toISOString(),
      actorUserId: LAB_PLATFORM_SYSTEM_USER_ID,
      payload: { runId, workflowId, triggerType, error },
    };
    await publishLabDomainEventPipeline(envelope, LAB_PLATFORM_SYSTEM_USER_ID);
  } catch (err) {
    // A failed publish must not escalate: the run is already recorded as failed, which is the fact
    // that matters. Losing the alert is bad; losing the record of the failure is worse.
    console.warn('[lab-workflows] could not publish run-failed event', runId, err);
  }
}

/**
 * A handle that records nothing.
 *
 * Used where a run must not be opened — notably a dry run, which is a *prediction* of what would
 * happen and must not pollute the history a user reads to decide whether the workflow works.
 */
export function nullRunHandle(workflowId = ''): WorkflowRunHandle {
  return {
    id: '',
    workflowId,
    recordStep() {},
    finish() {},
  };
}

export interface CapturedRun {
  steps: Array<{
    nodeId: string;
    nodeKind: string;
    status: LabWorkflowRunStepStatus;
    itemsInCount: number;
    itemsOutCount: number;
    durationMs: number | null;
    detail: Record<string, unknown> | null;
    error: string | null;
  }>;
  status: LabWorkflowRunStatus | null;
}

/**
 * A handle that keeps steps in memory (W5a dry run).
 *
 * A dry run is the designer's most-used button, and it needs to show what each node *would* do. It
 * must also leave no trace: no run row, no step rows, no pruning. `nullRunHandle` discards the
 * results, so this variant exists to keep them — same absence of persistence, but the caller can
 * render the outcome.
 */
export function createCapturedRunHandle(workflowId = ''): {
  handle: WorkflowRunHandle;
  captured: CapturedRun;
} {
  const captured: CapturedRun = { steps: [], status: null };
  return {
    captured,
    handle: {
      id: '',
      workflowId,
      recordStep(step) {
        captured.steps.push({
          nodeId: step.nodeId,
          nodeKind: step.nodeKind,
          status: step.status,
          itemsInCount: step.itemsInCount,
          itemsOutCount: step.itemsOutCount,
          durationMs: step.durationMs ?? null,
          detail: step.detail ?? null,
          error: step.error ?? null,
        });
      },
      finish(status) {
        captured.status = status ?? 'succeeded';
      },
    },
  };
}
