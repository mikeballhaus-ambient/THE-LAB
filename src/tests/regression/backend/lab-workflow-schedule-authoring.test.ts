import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { labWorkflowSchedulesRepository } from '@/backend/db/LabWorkflows/lab-workflow-schedules-repository';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowTriggerScheduleV1,
} from '@/shared/types/lab-workflow-graph';
import type { User } from '@/shared/types/user';
import { validateWorkflowDefinition } from '@/shared/utils/validate-lab-workflow-definition';

/**
 * Phase 34 — schedule authoring.
 *
 * The engine (tick, `computeNextFireAt`) has its own tests and is deliberately untouched. What can
 * only go wrong in *this* layer is the **reconcile**, so that is what these assert:
 *
 * - saving a graph with a schedule creates exactly one row, with a computed `next_fire_at`;
 * - re-saving an unchanged pattern keeps the same row id and the same `next_fire_at`;
 * - changing the zone recomputes rather than duplicating;
 * - removing the schedule deletes the row;
 * - a stored graph with no `schedule` still parses (the additive guarantee);
 * - the validator rejects a bad zone and a bad expression.
 */

const TRIGGER_ID = 'b2000002-0002-4002-8002-000000000011';
const ACTION_ID = 'b2000002-0002-4002-8002-000000000013';

const OWNER: User = {
  userId: 2,
  name: 'Owner',
  email: 'owner@example.com',
  role: 'owner',
} as User;

function definitionWithSchedule(
  schedule?: LabWorkflowTriggerScheduleV1,
): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: TRIGGER_ID,
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: 'app-lab-tasklist.task.created',
        ...(schedule ? { schedule } : {}),
      } as LabWorkflowDefinitionV2['nodes'][number],
      {
        id: ACTION_ID,
        kind: 'action',
        position: { x: 0, y: 120 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      },
    ],
    edges: [
      {
        id: 'b2000002-0002-4002-8002-000000000021',
        source: TRIGGER_ID,
        target: ACTION_ID,
        when: 'always',
      },
    ],
  };
}

describe('phase 34 — schedule reconcile', () => {
  let db: Database.Database;
  let workflowSeq = 0;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = OFF');
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowSchedulesRepository.bootstrap(db);
    // `setScheduleForCaller` re-runs the shared validator, which reads observed event types.
    await labEventsRepository.bootstrap(db);
    db.prepare('DELETE FROM lab_workflow_schedules').run();
    db.prepare('DELETE FROM lab_workflows').run();
    workflowSeq = 0;
  });

  afterEach(() => {
    labWorkflowsRepository.close();
    labWorkflowSchedulesRepository.close();
    db.close();
  });

  function createWorkflow(definition: LabWorkflowDefinitionV2): string {
    const id = `b20000aa-0002-4002-8002-0000000000${String(workflowSeq).padStart(2, '0')}`;
    workflowSeq += 1;
    labWorkflowsRepository.insertWorkflow({
      id,
      name: `Scheduled ${workflowSeq}`,
      description: null,
      scope: 'user',
      ownerUserId: OWNER.userId,
      createdByUserId: OWNER.userId,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify(definition),
    });
    return id;
  }

  test('saving a graph with a cron schedule creates one row with a computed next_fire_at', () => {
    const id = createWorkflow(
      definitionWithSchedule({
        kind: 'cron',
        expression: '0 9 * * 1-5',
        timezone: 'America/Denver',
      }),
    );

    labWorkflowsService.getForCaller(OWNER, id);

    const rows = labWorkflowSchedulesRepository.listForWorkflow(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.triggerNodeId).toBe(TRIGGER_ID);
    expect(rows[0]?.kind).toBe('cron');
    expect(rows[0]?.expression).toBe('0 9 * * 1-5');
    expect(rows[0]?.timezone).toBe('America/Denver');
    // Computed at write, not left null for the next tick to fill in.
    expect(rows[0]?.nextFireAt).not.toBeNull();
  });

  test('an unchanged pattern keeps the row id and the existing next_fire_at', () => {
    const schedule: LabWorkflowTriggerScheduleV1 = {
      kind: 'cron',
      expression: '0 9 * * 1-5',
      timezone: 'America/Denver',
    };
    const id = createWorkflow(definitionWithSchedule(schedule));
    labWorkflowsService.getForCaller(OWNER, id);
    const before = labWorkflowSchedulesRepository.listForWorkflow(id)[0]!;

    // Simulate the tick having advanced the row.
    labWorkflowSchedulesRepository.markFired(
      before.id,
      '2026-10-19T15:00:00.000Z',
      '2026-10-20T15:00:00.000Z',
    );

    labWorkflowsService.getForCaller(OWNER, id);
    const after = labWorkflowSchedulesRepository.listForWorkflow(id);

    expect(after).toHaveLength(1);
    // Reset the row on every reconcile would wipe fire history and could double-fire.
    expect(after[0]?.id).toBe(before.id);
    expect(after[0]?.nextFireAt).toBe('2026-10-20T15:00:00.000Z');
    expect(after[0]?.lastFiredAt).toBe('2026-10-19T15:00:00.000Z');
  });

  test('changing the zone recomputes next_fire_at on the same row', () => {
    const id = createWorkflow(
      definitionWithSchedule({ kind: 'cron', expression: '0 9 * * *', timezone: 'UTC' }),
    );
    labWorkflowsService.getForCaller(OWNER, id);
    const before = labWorkflowSchedulesRepository.listForWorkflow(id)[0]!;

    const stored = labWorkflowsRepository.getById(id)!;
    const definition = stored.definition as LabWorkflowDefinitionV2;
    const denver: LabWorkflowTriggerScheduleV1 = {
      kind: 'cron',
      expression: '0 9 * * *',
      timezone: 'America/Denver',
    };
    labWorkflowsRepository.updateWorkflow({
      ...stored,
      definition: {
        ...definition,
        nodes: definition.nodes.map((node) =>
          node.kind === 'trigger' ? { ...node, schedule: denver } : node,
        ),
      },
    });
    labWorkflowsService.getForCaller(OWNER, id);

    const after = labWorkflowSchedulesRepository.listForWorkflow(id);
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe(before.id);
    expect(after[0]?.timezone).toBe('America/Denver');
    expect(after[0]?.nextFireAt).not.toBe(before.nextFireAt);
  });

  test('removing the schedule deletes the row', () => {
    const id = createWorkflow(
      definitionWithSchedule({ kind: 'cron', expression: '0 9 * * *', timezone: 'UTC' }),
    );
    labWorkflowsService.getForCaller(OWNER, id);
    expect(labWorkflowSchedulesRepository.listForWorkflow(id)).toHaveLength(1);

    labWorkflowsService.setScheduleForCaller(OWNER, id, { schedule: null });

    // A live row for a schedule nobody can see would keep firing — the exact failure this guards.
    expect(labWorkflowSchedulesRepository.listForWorkflow(id)).toHaveLength(0);
    const stored = labWorkflowsRepository.getById(id)!;
    const trigger = (stored.definition as LabWorkflowDefinitionV2).nodes.find(
      (node) => node.kind === 'trigger',
    );
    expect((trigger as { schedule?: unknown }).schedule).toBeUndefined();
  });

  test('setting a schedule through the service writes the graph and returns nextFireAt', () => {
    const id = createWorkflow(definitionWithSchedule());
    const result = labWorkflowsService.setScheduleForCaller(OWNER, id, {
      schedule: { kind: 'interval', timezone: 'UTC', intervalMinutes: 90 },
    });

    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0]?.intervalMinutes).toBe(90);
    expect(result.schedules[0]?.nextFireAt).not.toBeNull();
    const stored = labWorkflowsRepository.getById(id)!;
    const trigger = (stored.definition as LabWorkflowDefinitionV2).nodes.find(
      (node) => node.kind === 'trigger',
    ) as { schedule?: { kind: string } };
    // One source of truth: the graph carries the pattern, the row carries the state.
    expect(trigger.schedule?.kind).toBe('interval');
  });

  test('a stored graph without a schedule still parses and reconciles to no rows', () => {
    // The additive guarantee: every graph authored before this phase keeps working.
    const id = createWorkflow(definitionWithSchedule());
    const schedules = labWorkflowsService.listSchedulesForCaller(OWNER, id);
    expect(schedules).toHaveLength(0);
  });

  test('a viewer cannot schedule a workflow', () => {
    const id = createWorkflow(definitionWithSchedule());
    const viewer = { ...OWNER, role: 'viewer' } as User;
    expect(() =>
      labWorkflowsService.setScheduleForCaller(viewer, id, {
        schedule: { kind: 'cron', expression: '0 9 * * *', timezone: 'UTC' },
      }),
    ).toThrow(/Viewers cannot schedule/);
  });
});

describe('phase 34 — validator', () => {
  test('a valid schedule produces no schedule issues', () => {
    const result = validateWorkflowDefinition(
      definitionWithSchedule({ kind: 'cron', expression: '0 9 * * 1-5', timezone: 'America/Denver' }),
    );
    expect(result.errors.filter((issue) => issue.code.includes('schedule'))).toHaveLength(0);
  });

  test('an unknown IANA zone is rejected, not silently UTC', () => {
    const result = validateWorkflowDefinition(
      definitionWithSchedule({ kind: 'cron', expression: '0 9 * * *', timezone: 'Mars/Olympus' }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain('invalid_schedule_zone');
  });

  test('an unparseable cron is rejected', () => {
    const result = validateWorkflowDefinition(
      definitionWithSchedule({ kind: 'cron', expression: '0 9 * * 1-5 2026', timezone: 'UTC' }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain('invalid_schedule_expression');
  });

  test('a cron without an expression is rejected', () => {
    const result = validateWorkflowDefinition(
      definitionWithSchedule({ kind: 'cron', timezone: 'UTC' }),
    );
    expect(result.errors.map((issue) => issue.code)).toContain('missing_schedule_expression');
  });

  test('an interval without minutes is rejected', () => {
    const result = validateWorkflowDefinition(
      definitionWithSchedule({ kind: 'interval', timezone: 'UTC' }),
    );
    expect(result.errors.map((issue) => issue.code)).toContain('missing_schedule_interval');
  });
});
