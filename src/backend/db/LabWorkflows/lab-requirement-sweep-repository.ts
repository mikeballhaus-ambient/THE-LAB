import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import type {
  LabRequirementSweepHealth,
  LabRequirementSweepState,
} from '@/shared/types/lab-requirement';

interface StateDbRow {
  requirement_key: string;
  record_id: string;
  last_fired_at: string;
  last_observed_date: string;
  fire_count: number;
}

interface HealthDbRow {
  requirement_key: string;
  consecutive_failures: number;
  next_attempt_ms: number | null;
  last_error: string | null;
  updated_at: string;
}

function mapState(row: StateDbRow): LabRequirementSweepState {
  return {
    requirementKey: row.requirement_key,
    recordId: row.record_id,
    lastFiredAt: row.last_fired_at,
    lastObservedDate: row.last_observed_date,
    fireCount: row.fire_count,
  };
}

function mapHealth(row: HealthDbRow): LabRequirementSweepHealth {
  return {
    requirementKey: row.requirement_key,
    consecutiveFailures: row.consecutive_failures,
    nextAttemptAt: row.next_attempt_ms,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

/**
 * Sweep state and per-requirement health (phase 33).
 *
 * Lives beside the other LabWorkflows repositories because it is state for the same platform clock,
 * but it is separate from `lab_workflow_schedules` because the two answer opposite questions: a
 * schedule says "when is this due next", while this says "this has already been delivered". Keeping
 * them apart is what makes the sweep's dedupe reviewable in isolation.
 */
export class LabRequirementSweepRepository extends Repository {
  private statements: Partial<Record<LabWorkflowsSQLStatementKey, import('better-sqlite3').Statement>> =
    {};

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

  getState(requirementKey: string, recordId: string): LabRequirementSweepState | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.requirement_state_get).get(
      requirementKey,
      recordId,
    ) as StateDbRow | undefined;
    return row ? mapState(row) : null;
  }

  /**
   * Record that a requirement fired for a record.
   *
   * Callers persist this **after** the event row is written and before publishing the pipeline: a
   * crash in between would re-fire once (a duplicate reminder, recoverable), whereas recording it
   * first and crashing later would lose the delivery entirely.
   */
  markFired(params: {
    requirementKey: string;
    recordId: string;
    firedAt: string;
    observedDate: string;
  }): void {
    this.stmt(LabWorkflowsSQLStatementKeys.requirement_state_upsert).run(
      params.requirementKey,
      params.recordId,
      params.firedAt,
      params.observedDate,
    );
  }

  getHealth(requirementKey: string): LabRequirementSweepHealth | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.requirement_health_get).get(
      requirementKey,
    ) as HealthDbRow | undefined;
    return row ? mapHealth(row) : null;
  }

  recordFailure(requirementKey: string, error: string, nextAttemptAtMs: number, nowIso: string): void {
    const previous = this.getHealth(requirementKey);
    const consecutive = (previous?.consecutiveFailures ?? 0) + 1;
    this.stmt(LabWorkflowsSQLStatementKeys.requirement_health_upsert).run(
      requirementKey,
      consecutive,
      nextAttemptAtMs,
      error.slice(0, 500),
      nowIso,
    );
  }

  /**
   * Clear backoff after a successful read.
   *
   * A row is deleted rather than zeroed so the table stays proportional to *currently broken*
   * requirements — the same reasoning as run steps: absence is the record of health.
   */
  clearHealth(requirementKey: string): void {
    this.stmt(LabWorkflowsSQLStatementKeys.requirement_health_reset).run(requirementKey);
  }
}

// `new`, matching `labWorkflowSchedulesRepository`: `Repository` is an abstract base with
// `bootstrap`/`initialize`, not a singleton provider.
export const labRequirementSweepRepository = new LabRequirementSweepRepository();
