/** Socket.IO event names for `/lab-events` namespace (not Lab Assistant or `/lab-comms`). */
export const LAB_EVENTS_SOCKET = {
  NOTIFICATION: 'lab_events:notification',
  UNREAD_COUNT: 'lab_events:unread_count',
  SUBSCRIBE: 'lab_events:subscribe',
  ERROR: 'lab_events:error',
  /**
   * One node of a manual designer run, emitted as the server executes it.
   *
   * Scoped by `runId` so a stale stream (a run the author abandoned, or a second tab) cannot colour
   * the wrong canvas. Only sent to the user who pressed Test/Run.
   */
  WORKFLOW_RUN_STEP: 'lab_events:workflow_run_step',
  /** Inbox / My requests lists changed for the recipient user (assignee or requester). */
  APPROVALS_INBOX_CHANGED: 'lab_events:approvals_inbox_changed',
  /** Platform journal entries or balances changed (post via UI or workflow). */
  LEDGER_JOURNAL_CHANGED: 'lab_events:ledger_journal_changed',
  /** PrimeVue toast routed to the signed-in user (Workflow Studio `show_user_toast`). */
  USER_TOAST: 'lab_events:user_toast',
} as const;

/** Payload for {@link LAB_EVENTS_SOCKET.WORKFLOW_RUN_STEP}. */
export interface LabWorkflowRunStepStreamEvent {
  /** Null for a dry run — a preview deliberately leaves no run row. */
  runId: string | null;
  workflowId: string;
  nodeId: string;
  nodeKind: string;
  status: 'running' | 'succeeded' | 'failed' | 'skipped';
  /** Monotonic order within the run, so the canvas can drop out-of-order deliveries. */
  seq: number;
}

export type LabEventsSocketEventName =
  (typeof LAB_EVENTS_SOCKET)[keyof typeof LAB_EVENTS_SOCKET];
