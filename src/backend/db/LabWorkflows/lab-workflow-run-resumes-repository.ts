import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import type { LabWorkflowRunResume } from '@/shared/types/lab-workflow-run-resume';

type ResumeDbRow = {
  run_id: string;
  workflow_id: string;
  node_id: string;
  items_json: string;
  resume_at: string;
  claimed_at: string | null;
  created_at: string;
};

function mapRow(row: ResumeDbRow): LabWorkflowRunResume {
  return {
    runId: row.run_id,
    workflowId: row.workflow_id,
    nodeId: row.node_id,
    itemsJson: row.items_json,
    resumeAt: row.resume_at,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
  };
}

/**
 * Suspended runs waiting on the clock (phase 36).
 *
 * Deliberately separate from `LabWorkflowSchedulesRepository`: a schedule owes an *expression
 * evaluation* and recurs, a resume owes an **item array** and fires once. Sharing a table would mean
 * every query carrying columns the other half does not use, and the two have different idempotency
 * rules — a schedule re-fires on its next window, a resume must never fire twice.
 */
export class LabWorkflowRunResumesRepository extends Repository {
  private statements: Partial<Record<LabWorkflowsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
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

  /** Suspend a run, or re-suspend it with a fresh instant if it was already waiting. */
  insert(params: {
    runId: string;
    workflowId: string;
    nodeId: string;
    itemsJson: string;
    resumeAt: string;
  }): void {
    this.stmt(LabWorkflowsSQLStatementKeys.resume_insert).run(
      params.runId,
      params.workflowId,
      params.nodeId,
      params.itemsJson,
      params.resumeAt,
    );
  }

  getForRun(runId: string): LabWorkflowRunResume | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.resume_for_run).get(runId) as
      | ResumeDbRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  /**
   * Unclaimed rows whose instant has arrived.
   *
   * Bounded like `listDue` on schedules: a backlog must not make one tick run for minutes, and
   * ordering by `resume_at` means the longest-waiting run goes first rather than starving.
   */
  listDue(nowIso: string, limit: number): LabWorkflowRunResume[] {
    return (this.stmt(LabWorkflowsSQLStatementKeys.resumes_due).all(nowIso, limit) as ResumeDbRow[]).map(
      mapRow,
    );
  }

  /**
   * Take ownership of a row. Returns `false` when another tick already claimed it.
   *
   * This is the whole idempotency story: `scheduler.ticking` only stops re-entrancy inside one
   * process, whereas this stops a restart, a second backend, or an overlapping tick from resuming the
   * same run twice — which would notify people twice.
   */
  claim(runId: string, claimedAt: string): boolean {
    const result = this.stmt(LabWorkflowsSQLStatementKeys.resume_claim).run(claimedAt, runId);
    return result.changes > 0;
  }

  delete(runId: string): void {
    this.stmt(LabWorkflowsSQLStatementKeys.resume_delete).run(runId);
  }
}

// `new`, matching every other `Repository` subclass in this folder (see the note in
// `lab-workflow-schedules-repository.ts`): `Repository` is an abstract base, not a singleton provider.
export const labWorkflowRunResumesRepository = new LabWorkflowRunResumesRepository();
