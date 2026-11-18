import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type {
  LabWorkflowActionGroupExecutionMode,
  LabWorkflowActionGroupFailurePolicy,
  LabWorkflowGraphGroupType,
  LabWorkflowRuleGroupCombineMode,
} from '@/shared/types/lab-workflow-graph-group';

export const LAB_WORKFLOW_GRAPH_SCHEMA_VERSION = 2;

/** How an outgoing connection is taken during graph execution. */
export type LabWorkflowEdgeWhen =
  | 'always'
  | 'on_match'
  | 'on_no_match'
  | 'on_true'
  | 'on_false';

/** Upper bound on a routing node's output ports. A graph is user-authored data. */
export const LAB_WORKFLOW_MAX_OUTPUT_PORTS = 10;

export interface LabWorkflowGraphViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface LabWorkflowGraphPosition {
  x: number;
  y: number;
}

export interface LabWorkflowGraphEdgeV2 {
  id: string;
  source: string;
  target: string;
  when: LabWorkflowEdgeWhen;
  /**
   * Which output port of a routing node this edge leaves from (W7).
   *
   * `undefined` means "the node's single implicit output" — every edge authored before routing
   * existed. An edge **with** an index is only taken when the node actually emitted that port, so a
   * Switch's unmatched branch is a real, addressable route rather than dead code.
   */
  outputIndex?: number;
  label?: string;
}

/**
 * Per-node retry policy (W2).
 *
 * Retries exist because the failures that actually happen in a lab are transient: a catalog app
 * server was still starting, a socket dropped, a SQLite write hit `busy`. Retrying those is right.
 * Retrying a *validation* failure is not — it will fail identically every time and just delays the
 * error, so `attempts` counts **additional** attempts and the default is zero.
 */
export interface LabWorkflowNodeRetry {
  /** Additional attempts after the first. `0` (default) means try once. Capped at `MAX`. */
  attempts?: number;
  /** Base delay before the first retry; doubles each subsequent attempt. */
  backoffMs?: number;
}

/** Upper bounds. A graph is user-authored data, so the runtime must not trust it. */
export const LAB_WORKFLOW_NODE_RETRY_MAX_ATTEMPTS = 5;
export const LAB_WORKFLOW_NODE_BACKOFF_MAX_MS = 10_000;
export const LAB_WORKFLOW_NODE_TIMEOUT_MAX_MS = 60_000;

/**
 * Fields shared by every kind of node that does work.
 *
 * These live on the node rather than on `step` because they are execution policy, not operation
 * configuration: the same operation may be retried three times in one graph and once in another.
 */
export interface LabWorkflowNodeExecutionPolicy {
  retry?: LabWorkflowNodeRetry;
  /** Abandon the node after this long and record `timeout`. Omitted = no timeout. */
  timeoutMs?: number;
  /**
   * Idempotency key template (W2.3), e.g. `task.created:{{payload.taskId}}`.
   *
   * A side-effecting node that has already completed with the same resolved key inside the
   * retention window is skipped rather than repeated. This is what makes a retry safe when the
   * failure happened *after* the effect landed — the classic "created the record, then the response
   * was lost" case.
   */
  idempotencyKey?: string;
}

/** How an authored schedule decides its next occurrence. */
export type LabWorkflowTriggerScheduleKind = 'cron' | 'interval' | 'recurrence';

/**
 * An **authored** schedule, stored on the trigger node (phase 34).
 *
 * This is the declarative half of a scheduled trigger. The row in `lab_workflow_schedules` remains
 * runtime state (`next_fire_at`, `last_fired_at`) derived from it — the same split action nodes use
 * for execution policy. Keeping the pattern in the graph is what lets export/import carry a schedule
 * at all: a side-table row is invisible to a serialised definition.
 *
 * `relative` and `staleness` are deliberately **absent**. They need a record date that
 * `computeNextFireAt` is never given on the schedule path, so authoring one produces a schedule that
 * silently never fires. Per-record timing is the platform requirement sweep's job.
 */
export interface LabWorkflowTriggerScheduleV1 {
  kind: LabWorkflowTriggerScheduleKind;
  /** Cron (5-field) or an RRULE body. Absent for `interval`. */
  expression?: string;
  /** IANA zone name (e.g. `America/Denver`). Never an offset — a fixed offset breaks at DST. */
  timezone: string;
  /** `interval` only: minutes between fires. */
  intervalMinutes?: number;
}

/**
 * One output-mapping row on a dynamic-payload trigger (phase 37).
 *
 * `from` is the **observed** path a caller sends; `to` is the stable name downstream nodes use. The
 * pair is what lets a workflow survive a caller renaming its fields: only the mapping changes.
 */
export interface LabWorkflowTriggerMappingRow {
  /** Path on the incoming payload, as a capture reported it (dots for nesting, `[]` for arrays). */
  from: string;
  /** Path on the synthesised payload the graph receives. */
  to: string;
}

export type LabWorkflowGraphNodeV2 =
  | {
      id: string;
      kind: 'trigger';
      position: LabWorkflowGraphPosition;
      /** The domain event type. For a schedule-only trigger this is the synthesised envelope type. */
      eventType: string;
      /** Optional wall-clock schedule. Absent on event- and webhook-only triggers. */
      schedule?: LabWorkflowTriggerScheduleV1;
      /**
       * Output mapping for a **dynamic-payload** trigger (phase 37).
       *
       * Absent or empty ⇒ the payload passes through unchanged, which is the pre-37 behaviour and
       * keeps every existing graph working. Populated ⇒ the payload is **reduced** to these pairs, so
       * unmapped fields are dropped.
       *
       * Dropping is deliberate: a mapping that passes everything through is advisory, and a
       * misspelled `to` becomes invisible instead of surfacing as a missing field.
       */
      mapping?: LabWorkflowTriggerMappingRow[];
    }
  | {
      id: string;
      kind: 'condition';
      position: LabWorkflowGraphPosition;
      conditions: LabRuleConditionV1[];
    }
  | {
      id: string;
      kind: 'rule';
      position: LabWorkflowGraphPosition;
      groupId?: string;
      /** Display name when the rule is stored on this workflow (preferred). */
      name?: string;
      /** Evaluated against the workflow trigger event when inline. */
      conditions?: LabRuleConditionV1[];
      /** @deprecated Library Rules Engine link — use inline `name` + `conditions`. */
      ruleId?: string;
    }
  | {
      id: string;
      kind: 'action';
      position: LabWorkflowGraphPosition;
      /** When set, node is drawn inside this group on the canvas. */
      groupId?: string;
      step: LabWorkflowStepV1;
    } & LabWorkflowNodeExecutionPolicy
  | {
      id: string;
      kind: 'group';
      position: LabWorkflowGraphPosition;
      label: string;
      width?: number;
      height?: number;
      /** Defaults to `actions` when omitted (legacy graphs). */
      groupType?: LabWorkflowGraphGroupType;
      /** Action groups: run member steps in order or in parallel. */
      executionMode?: LabWorkflowActionGroupExecutionMode;
      /** Action groups: stop or continue when a step aborts. */
      failurePolicy?: LabWorkflowActionGroupFailurePolicy;
      /** Rule groups: how member rules are combined. */
      ruleCombine?: LabWorkflowRuleGroupCombineMode;
      /** Rule groups: still follow outgoing branches when combine result is no match. */
      continueOnNoMatch?: boolean;
    };

export interface LabWorkflowDefinitionV2 {
  schemaVersion: typeof LAB_WORKFLOW_GRAPH_SCHEMA_VERSION;
  nodes: LabWorkflowGraphNodeV2[];
  edges: LabWorkflowGraphEdgeV2[];
  viewport?: LabWorkflowGraphViewport;
}
