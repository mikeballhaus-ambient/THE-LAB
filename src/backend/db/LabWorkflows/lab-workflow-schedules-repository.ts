import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import type {
  LabWorkflowSchedule,
  LabWorkflowScheduleKind,
} from '@/shared/types/lab-workflow-schedule';

type ScheduleDbRow = {
  id: string;
  workflow_id: string;
  trigger_node_id: string;
  kind: string;
  expression: string | null;
  timezone: string;
  interval_minutes: number | null;
  offset_days: number | null;
  record_date_path: string | null;
  next_fire_at: string | null;
  last_fired_at: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ScheduleDbRow): LabWorkflowSchedule {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    triggerNodeId: row.trigger_node_id,
    kind: row.kind as LabWorkflowScheduleKind,
    expression: row.expression,
    timezone: row.timezone,
    intervalMinutes: row.interval_minutes,
    offsetDays: row.offset_days,
    recordDatePath: row.record_date_path,
    nextFireAt: row.next_fire_at,
    lastFiredAt: row.last_fired_at,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InsertScheduleParams {
  id: string;
  workflowId: string;
  triggerNodeId: string;
  kind: LabWorkflowScheduleKind;
  expression?: string | null;
  timezone: string;
  intervalMinutes?: number | null;
  offsetDays?: number | null;
  recordDatePath?: string | null;
  nextFireAt?: string | null;
  enabled?: boolean;
}

/**
 * Schedules for time-triggered workflows (W8).
 *
 * This lives beside `LabWorkflowsRepository` rather than inside it because the two answer different
 * questions and change on different clocks: the workflow document changes when a user edits, the
 * schedule changes on every tick.
 */
export class LabWorkflowSchedulesRepository extends Repository {
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

  listAll(): LabWorkflowSchedule[] {
    return (this.stmt(LabWorkflowsSQLStatementKeys.schedules_all).all() as ScheduleDbRow[]).map(mapRow);
  }

  /** Every schedule belonging to one workflow — the editor's read of "when will this next run?". */
  listForWorkflow(workflowId: string): LabWorkflowSchedule[] {
    return (
      this.stmt(LabWorkflowsSQLStatementKeys.schedules_for_workflow).all(workflowId) as ScheduleDbRow[]
    ).map(mapRow);
  }

  /**
   * Schedules that are due at `nowIso`.
   *
   * Bounded by `limit` so a database full of overdue rows cannot make one tick run for minutes; the
   * next tick picks up the remainder, which is why the ordering is by `next_fire_at` — the oldest
   * overdue row goes first rather than starving.
   */
  listDue(nowIso: string, limit: number): LabWorkflowSchedule[] {
    return (
      this.stmt(LabWorkflowsSQLStatementKeys.schedules_due).all(nowIso, limit) as ScheduleDbRow[]
    ).map(mapRow);
  }

  findById(id: string): LabWorkflowSchedule | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.schedule_by_id).get(id) as
      | ScheduleDbRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  findByTrigger(workflowId: string, triggerNodeId: string): LabWorkflowSchedule | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.schedule_for_trigger).get(
      workflowId,
      triggerNodeId,
    ) as ScheduleDbRow | undefined;
    return row ? mapRow(row) : null;
  }

  insert(params: InsertScheduleParams): void {
    this.stmt(LabWorkflowsSQLStatementKeys.schedule_insert).run(
      params.id,
      params.workflowId,
      params.triggerNodeId,
      params.kind,
      params.expression ?? null,
      params.timezone,
      params.intervalMinutes ?? null,
      params.offsetDays ?? null,
      params.recordDatePath ?? null,
      params.nextFireAt ?? null,
      params.enabled === false ? 0 : 1,
    );
  }

  update(
    id: string,
    params: {
      kind: LabWorkflowScheduleKind;
      expression?: string | null;
      timezone: string;
      intervalMinutes?: number | null;
      offsetDays?: number | null;
      recordDatePath?: string | null;
      enabled: boolean;
    },
  ): void {
    this.stmt(LabWorkflowsSQLStatementKeys.schedule_update).run(
      params.kind,
      params.expression ?? null,
      params.timezone,
      params.intervalMinutes ?? null,
      params.offsetDays ?? null,
      params.recordDatePath ?? null,
      params.enabled ? 1 : 0,
      id,
    );
  }

  /**
   * Set the next fire instant without touching `last_fired_at` (phase 34 reconcile).
   *
   * Used when the authored pattern changes: the instant must be recomputed, but the workflow has not
   * fired, so stamping `last_fired_at` would make the run panel claim a run that never happened and
   * would also trip the per-workflow floor for a minute after an unrelated edit.
   */
  setNextFireAt(id: string, nextFireAt: string | null): void {
    this.stmt(LabWorkflowsSQLStatementKeys.schedule_set_next_fire).run(nextFireAt, id);
  }

  /**
   * Record a fire and advance the schedule in one statement.
   *
   * Both halves in one UPDATE because two statements would allow a crash between them, which
   * re-fires the same window on the next tick — the one failure mode a scheduler must not have.
   */
  markFired(id: string, lastFiredAt: string, nextFireAt: string | null): void {
    this.stmt(LabWorkflowsSQLStatementKeys.schedule_mark_fired).run(lastFiredAt, nextFireAt, id);
  }

  delete(id: string): void {
    this.stmt(LabWorkflowsSQLStatementKeys.schedule_delete).run(id);
  }

  countEnabled(): number {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.schedule_enabled_count).get() as { c: number };
    return row.c;
  }
}

// `new`, matching `labWorkflowsRepository` and every other `Repository` subclass in this folder:
// `Repository` is an abstract base with `bootstrap`/`initialize`, not a singleton provider, so a
// `getInstance()` here would be the only one of its kind.
export const labWorkflowSchedulesRepository = new LabWorkflowSchedulesRepository();
