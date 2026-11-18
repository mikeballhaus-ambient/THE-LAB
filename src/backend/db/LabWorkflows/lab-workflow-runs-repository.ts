import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import {
  LAB_WORKFLOW_RUN_JSON_MAX_BYTES,
  LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW,
  type LabWorkflowRun,
  type LabWorkflowRunStatus,
  type LabWorkflowRunStep,
  type LabWorkflowRunStepStatus,
  type LabWorkflowTriggerType,
} from '@/shared/types/lab-workflow-run';

type RunDbRow = {
  id: string;
  workflow_id: string;
  trigger_type: string;
  status: string;
  event_id: string | null;
  envelope_json: string | null;
  mock_sample_id: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

type RunStepDbRow = {
  id: number;
  run_id: string;
  seq: number;
  node_id: string;
  node_kind: string;
  status: string;
  items_in_count: number;
  items_out_count: number;
  duration_ms: number | null;
  detail_json: string | null;
  error: string | null;
  created_at: string;
};

function mapRunRow(row: RunDbRow): LabWorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    triggerType: row.trigger_type as LabWorkflowTriggerType,
    status: row.status as LabWorkflowRunStatus,
    eventId: row.event_id,
    envelopeJson: row.envelope_json,
    mockSampleId: row.mock_sample_id ?? null,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function mapRunStepRow(row: RunStepDbRow): LabWorkflowRunStep {
  let detail: Record<string, unknown> | null = null;
  if (row.detail_json) {
    try {
      const parsed = JSON.parse(row.detail_json) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        detail = parsed as Record<string, unknown>;
      }
    } catch {
      detail = null;
    }
  }
  return {
    id: row.id,
    runId: row.run_id,
    seq: row.seq,
    nodeId: row.node_id,
    nodeKind: row.node_kind,
    status: row.status as LabWorkflowRunStepStatus,
    itemsInCount: row.items_in_count,
    itemsOutCount: row.items_out_count,
    durationMs: row.duration_ms,
    detail,
    error: row.error,
    createdAt: row.created_at,
  };
}

/**
 * Cap a JSON blob before it reaches the database.
 *
 * The envelope is stored so a run can be replayed and so the designer can show "what did this
 * workflow actually receive". A pathological payload should not be able to bloat the run table, so
 * oversized input is replaced with a marker rather than truncated into invalid JSON.
 */
export function capRunJson(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  if (json.length > LAB_WORKFLOW_RUN_JSON_MAX_BYTES) {
    return JSON.stringify({
      truncated: true,
      originalBytes: json.length,
      note: `payload exceeded ${LAB_WORKFLOW_RUN_JSON_MAX_BYTES} bytes`,
    });
  }
  return json;
}

export interface StartRunParams {
  id: string;
  workflowId: string;
  triggerType: LabWorkflowTriggerType;
  eventId: string | null;
  envelope: unknown;
  /** Set when this run replayed a saved mock (W5b). */
  mockSampleId?: string | null;
  startedAt: string;
}

export interface RecordStepParams {
  runId: string;
  seq: number;
  nodeId: string;
  nodeKind: string;
  status: LabWorkflowRunStepStatus;
  itemsInCount: number;
  itemsOutCount: number;
  durationMs: number | null;
  detail: Record<string, unknown> | null;
  error: string | null;
}

export interface FinishRunParams {
  runId: string;
  status: LabWorkflowRunStatus;
  error: string | null;
  finishedAt: string;
}

export class LabWorkflowRunsRepository extends Repository {
  private statements: Partial<Record<LabWorkflowsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    // The workflow schema owns both run tables; bootstrapping here keeps this repository usable in
    // isolation (tests bootstrap repositories one at a time).
    const { bootstrapLabWorkflowsSchema } = await import('./lab-workflows-schema');
    bootstrapLabWorkflowsSchema(this.db);
    this.statements = createLabWorkflowsSQLStatements(this.db);
  }

  private stmt(key: LabWorkflowsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabWorkflows SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  startRun(params: StartRunParams): void {
    this.stmt(LabWorkflowsSQLStatementKeys.run_insert).run(
      params.id,
      params.workflowId,
      params.triggerType,
      params.eventId,
      capRunJson(params.envelope),
      params.mockSampleId ?? null,
      params.startedAt,
    );
  }

  recordStep(params: RecordStepParams): void {
    this.stmt(LabWorkflowsSQLStatementKeys.step_insert).run(
      params.runId,
      params.seq,
      params.nodeId,
      params.nodeKind,
      params.status,
      params.itemsInCount,
      params.itemsOutCount,
      params.durationMs,
      params.detail ? capRunJson(params.detail) : null,
      params.error,
    );
  }

  finishRun(params: FinishRunParams): void {
    this.stmt(LabWorkflowsSQLStatementKeys.run_finish).run(
      params.status,
      params.error,
      params.finishedAt,
      params.runId,
    );
  }

  getRun(runId: string): LabWorkflowRun | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.run_by_id).get(runId) as RunDbRow | undefined;
    return row ? mapRunRow(row) : null;
  }

  listRunsForWorkflow(workflowId: string, limit = 25): LabWorkflowRun[] {
    const rows = this.stmt(LabWorkflowsSQLStatementKeys.runs_for_workflow).all(
      workflowId,
      limit,
    ) as RunDbRow[];
    return rows.map(mapRunRow);
  }

  listRecentRuns(limit = 50): LabWorkflowRun[] {
    const rows = this.stmt(LabWorkflowsSQLStatementKeys.runs_recent).all(limit) as RunDbRow[];
    return rows.map(mapRunRow);
  }

  /**
   * Delete one run belonging to a workflow.
   *
   * Returns the number of rows removed so the caller can distinguish a real delete from an id that
   * belongs to another workflow (or no longer exists) — a silent success would leave a "deleted" row
   * on screen until the next refresh.
   */
  deleteRun(workflowId: string, runId: string): number {
    const result = this.stmt(LabWorkflowsSQLStatementKeys.run_delete).run(runId, workflowId);
    return result.changes;
  }

  listStepsForRun(runId: string): LabWorkflowRunStep[] {
    const rows = this.stmt(LabWorkflowsSQLStatementKeys.steps_for_run).all(runId) as RunStepDbRow[];
    return rows.map(mapRunStepRow);
  }

  /**
   * Keep only the newest `limit` runs for a workflow.
   *
   * Called after a run finishes, not on a timer: the table grows exactly when it is written, so
   * pruning there means the table never has a chance to grow unbounded between sweeps. Steps go with
   * their run through `ON DELETE CASCADE`.
   */
  pruneRunsForWorkflow(
    workflowId: string,
    limit = LAB_WORKFLOW_RUN_RETENTION_PER_WORKFLOW,
  ): void {
    this.stmt(LabWorkflowsSQLStatementKeys.runs_prune_for_workflow).run(workflowId, workflowId, limit);
  }
}

export const labWorkflowRunsRepository = new LabWorkflowRunsRepository();
