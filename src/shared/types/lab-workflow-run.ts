/**
 * Execution records for Workflow Studio.
 *
 * ## Why this exists
 *
 * Before W1 a workflow could run and leave no trace. "Did my workflow fire?" had no answer that did
 * not involve reading server logs, which is not an answer a business user can act on. Every later
 * phase depends on this: the designer's run panel (W5), retry accounting (W2), and the agent-facing
 * `workflow_runs` MCP tool (M-plan) all read these rows.
 *
 * ## What a run is
 *
 * One run = one workflow reacting to one cause. The cause is described by `triggerType`:
 *
 * | triggerType | Opened by | Wired in |
 * |---|---|---|
 * | `event` | a published domain event matching the trigger | W1 |
 * | `manual` | a user pressing Run in the designer | W5a |
 * | `schedule` | the clock | W8 |
 * | `webhook` | an inbound HTTP call | W10 |
 *
 * The union is declared in full now so that W5/W8/W10 need no schema change. The database does not
 * enforce it with a `CHECK` on purpose: adding a trigger type later must not require a table rebuild.
 * Validation lives in TypeScript.
 *
 * ## What a step is
 *
 * One step = one graph node that actually executed. Nodes skipped because a rule did not match, or
 * because an earlier node aborted, produce no step row — the absence *is* the record. This keeps the
 * step table proportional to work done rather than to graph size.
 */

/** Terminal state of a run. `running` means it is still open. */
export type LabWorkflowRunStatus =
  | 'running'
  | 'succeeded'
  | 'partial'
  | 'failed'
  | 'skipped';

export type LabWorkflowTriggerType = 'event' | 'manual' | 'schedule' | 'webhook';

export type LabWorkflowRunStepStatus = 'succeeded' | 'failed' | 'skipped';

/**
 * Per-node colour state on the designer canvas.
 *
 * `running` is playback-only: the backend executes the whole graph before answering, so the canvas
 * replays the returned steps rather than observing live execution. It exists so the node currently
 * being narrated is distinguishable from one already settled.
 */
export type LabWorkflowRunNodeVisualStatus = 'running' | LabWorkflowRunStepStatus;

export interface LabWorkflowRun {
  id: string;
  workflowId: string;
  triggerType: LabWorkflowTriggerType;
  status: LabWorkflowRunStatus;
  /** Null for triggers that did not originate from a domain event. */
  eventId: string | null;
  /** The envelope as it was seen, so a run can be replayed (W5b mocks). Size-capped. */
  envelopeJson: string | null;
  /**
   * The mock sample this run replayed (W5b), or null for a real trigger.
   *
   * A mocked run is still a real run — it writes for real unless it was also a dry run — so history
   * has to distinguish "this happened" from "this was a rehearsal". The id, not a boolean, because
   * "which payload was it?" is the useful follow-up question.
   */
  mockSampleId: string | null;
  /** Why the run failed, when it did. */
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface LabWorkflowRunStep {
  id: number;
  runId: string;
  /** 1-based position within the run. Makes "the third node" addressable. */
  seq: number;
  nodeId: string;
  nodeKind: string;
  status: LabWorkflowRunStepStatus;
  itemsInCount: number;
  itemsOutCount: number;
  durationMs: number | null;
  /** Node-specific facts — e.g. `{ matched: false }` for a rule, `{ userId: 2 }` for a notify. */
  detail: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
}

/**
 * Captured payloads above this size are replaced with a marker.
 *
 * A step row is written for every executed node of every run, so an unbounded JSON column would make
 * the run tables outgrow the data they describe. 8 KB is comfortably larger than any lab event
 * payload while keeping a full run under a few hundred KB.
 */
export const LAB_WORKFLOW_RUN_JSON_MAX_BYTES = 8192;

/** How many runs are retained per workflow before the oldest are pruned (W1.5). */
export const LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW = 200;

/** One node result as reported back to the designer (W5a). */
export interface LabWorkflowManualRunStep {
  nodeId: string;
  nodeKind: string;
  status: LabWorkflowRunStepStatus;
  itemsInCount: number;
  itemsOutCount: number;
  durationMs: number | null;
  detail: Record<string, unknown> | null;
  error: string | null;
}

/** A structural validation issue, mirrored here so the run panel needs one import. */
export interface LabWorkflowManualRunIssue {
  severity: 'error' | 'warning';
  code: string;
  targetId: string | null;
  message: string;
}

/**
 * What a designer-triggered run reports back.
 *
 * `dryRun` runs have **no `runId`** — they deliberately leave no row, because a preview must not
 * appear in the history a user reads to decide whether the workflow works. The steps are still
 * returned so the panel can explain what *would* have happened.
 */
export interface LabWorkflowManualRunResult {
  runId: string | null;
  dryRun: boolean;
  status: LabWorkflowRunStatus;
  steps: LabWorkflowManualRunStep[];
  /** Validation findings for the version that ran, so the panel can show both together (W3.4). */
  issues: LabWorkflowManualRunIssue[];
  /** Why nothing ran — a trigger mismatch, a disabled workflow, or a thrown error. */
  reason?: string;
}
