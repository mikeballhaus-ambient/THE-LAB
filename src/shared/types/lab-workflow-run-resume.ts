/**
 * A run suspended by a `wait` node, waiting on the platform clock (phase 36 / W8.6).
 *
 * The row carries the **item array** the next node must receive. That is the whole design: `wait`
 * passes its input through unchanged, so at the moment of suspending the node already holds exactly
 * what the continuation needs. Nothing is re-executed on resume — re-running upstream nodes would
 * re-fire their side effects.
 */
export interface LabWorkflowRunResume {
  runId: string;
  workflowId: string;
  /** The `wait` node that suspended. Resume walks the edges leaving it. */
  nodeId: string;
  /** The items the next node receives. Persisted by the evaluator when it unwinds. */
  itemsJson: string;
  resumeAt: string;
  /** Set when a tick takes the row. `null` means still waiting to be resumed. */
  claimedAt: string | null;
  createdAt: string;
}

/** Cap on how many suspended runs one tick may resume, mirroring the schedule per-tick cap. */
export const LAB_WORKFLOW_RESUME_MAX_PER_TICK = 25;

/**
 * Upper bound on the persisted item array.
 *
 * The same 8 KB that bounds a run's JSON detail. Over the cap the run is finished `failed` with an
 * explicit message rather than truncating: a resumed run handed partial items would continue with
 * wrong data and no indication.
 */
export const LAB_WORKFLOW_RESUME_MAX_ITEMS_BYTES = 32_768;
