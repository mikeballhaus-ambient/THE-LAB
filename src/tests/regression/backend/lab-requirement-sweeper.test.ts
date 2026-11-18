import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { DateTime } from 'luxon';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labRequirementSweepRepository } from '@/backend/db/LabWorkflows/lab-requirement-sweep-repository';
import { labRequirementSweeper } from '@/backend/lab-workflows/lab-requirement-sweeper';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import type { IntegrationRecordList } from '@/backend/lab-workflows/lab-workflow-integration-connector-client';
import { WF_TEST_TRIGGER } from '../lab-workflow-graph-fixture-ids';

/**
 * Phase 33 gate — the requirement sweep.
 *
 * The assertions that matter, in the order the phase doc lists them:
 *
 * - A lease 31 days out publishes nothing; at 30 days, exactly once; at 29 days, nothing again.
 * - A second and third tick over an unchanged dataset publish **zero** additional events.
 * - Two leases expiring on different dates each get their own event with their own record id.
 * - An `ended` lease never fires.
 * - One unreachable app does not stop the others.
 *
 * The lister is injected, so none of this needs an app server; the workflow rows and the event
 * table are real, so the run/publish path is the production one.
 */

const LEASE_EXPIRING = 'app-rental-property.lease.expiring';
const MAINTENANCE_DUE = 'app-home-maintenance.maintenance.due';
const WORKFLOW_ID = 'e6d00007-0013-4013-8013-000000000033';
const TODAY = DateTime.fromISO('2026-11-01T12:00:00', { zone: 'utc' });

function dayOffset(days: number): string {
  return TODAY.plus({ days }).toISODate() ?? '';
}

function workflowTriggeringOn(eventType: string) {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: WF_TEST_TRIGGER,
        kind: 'trigger' as const,
        position: { x: 0, y: 0 },
        eventType,
      },
    ],
    edges: [],
  };
}

describe('requirement sweep (phase 33)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, 'system@the-lab.platform', 'THE-LAB', 'viewer', 'active')`,
    ).run(LAB_PLATFORM_SYSTEM_USER_ID);

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    // Bootstrapped so the publish path is the real one: a swept event must produce a run row, which
    // is the difference between "an event was published" and "the author's workflow actually ran".
    await labWorkflowRunsRepository.bootstrap(db);
    await labRequirementSweepRepository.bootstrap(db);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    db.prepare('DELETE FROM lab_workflow_runs').run();
    db.prepare('DELETE FROM lab_requirement_sweep_state').run();
    db.prepare('DELETE FROM lab_requirement_sweep_health').run();
    db.prepare('DELETE FROM lab_domain_events').run();
    db.prepare('DELETE FROM lab_workflows').run();
  });

  let workflowSeq = 0;

  /** One workflow per event type: the id must be unique per row, not per test. */
  function seedWorkflow(eventType: string): void {
    workflowSeq += 1;
    labWorkflowsRepository.insertWorkflow({
      id: `${WORKFLOW_ID}-${workflowSeq}`,
      name: `Listen for ${eventType}`,
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify(workflowTriggeringOn(eventType)),
    });
  }

  /** A lister that answers per service id, so one test can break one app and not the other. */
  function listerFor(
    recordsByService: Record<string, Record<string, unknown>[]>,
  ): typeof import('@/backend/lab-workflows/lab-workflow-integration-connector-client').listIntegrationRecords {
    return async (_actor, _providerAppId, serviceId): Promise<IntegrationRecordList> => {
      if (!(serviceId in recordsByService)) {
        throw new Error(`app server unreachable: ${serviceId}`);
      }
      return { records: recordsByService[serviceId], truncated: false };
    };
  }

  function publishedEventTypes(): string[] {
    const rows = db.prepare('SELECT type FROM lab_domain_events ORDER BY rowid').all() as Array<{
      type: string;
    }>;
    return rows.map((row) => row.type);
  }

  test('a lease 31 days out publishes nothing, at 30 days exactly once, and not again', async () => {
    seedWorkflow(LEASE_EXPIRING);
    const lease = {
      id: 101,
      propertyId: 7,
      tenantName: 'A Tenant',
      startDate: '2025-12-01',
      endDate: dayOffset(31),
      status: 'active',
    };
    const lister = listerFor({ 'rental-property.leases': [lease] });

    const before = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(before.fired).toBe(0);
    expect(publishedEventTypes()).toEqual([]);

    // One day later the same lease is exactly 30 days out — the window opens.
    const atWindow = await labRequirementSweeper.tick({
      now: TODAY.plus({ days: 1 }),
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(atWindow.fired).toBe(1);
    expect(publishedEventTypes()).toEqual([LEASE_EXPIRING]);

    // And not again, on that tick or the next.
    const again = await labRequirementSweeper.tick({
      now: TODAY.plus({ days: 1 }),
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(again.fired).toBe(0);

    const nextDay = await labRequirementSweeper.tick({
      now: TODAY.plus({ days: 2 }),
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(nextDay.fired).toBe(0);
    expect(publishedEventTypes()).toEqual([LEASE_EXPIRING]);
  });

  test('an unchanged dataset publishes zero additional events on later ticks', async () => {
    seedWorkflow(LEASE_EXPIRING);
    const lister = listerFor({
      'rental-property.leases': [
        {
          id: 202,
          tenantName: 'B Tenant',
          startDate: '2025-12-01',
          endDate: dayOffset(10),
          status: 'active',
        },
      ],
    });

    const first = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    const second = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    const third = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });

    // This is the assertion that a per-tick sweep would fail ~4 320 times a day.
    expect(first.fired).toBe(1);
    expect(second.fired).toBe(0);
    expect(third.fired).toBe(0);
    expect(publishedEventTypes()).toHaveLength(1);
  });

  test('two leases expiring on different dates each fire with their own record id', async () => {
    seedWorkflow(LEASE_EXPIRING);
    const lister = listerFor({
      'rental-property.leases': [
        { id: 301, tenantName: 'C', endDate: dayOffset(5), status: 'active' },
        { id: 302, tenantName: 'D', endDate: dayOffset(20), status: 'active' },
      ],
    });

    const result = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(result.fired).toBe(2);

    const payloads = db
      .prepare('SELECT payload_json FROM lab_domain_events ORDER BY rowid')
      .all() as Array<{ payload_json: string }>;
    expect(payloads.map((row) => JSON.parse(row.payload_json).recordId)).toEqual(['301', '302']);
  });

  test('an ended lease never fires', async () => {
    seedWorkflow(LEASE_EXPIRING);
    const lister = listerFor({
      'rental-property.leases': [
        { id: 401, tenantName: 'E', endDate: dayOffset(5), status: 'ended' },
        { id: 402, tenantName: 'F', endDate: dayOffset(5), status: 'pending' },
      ],
    });

    const result = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(result.fired).toBe(0);
    expect(publishedEventTypes()).toEqual([]);
  });

  test('a requirement whose app is down counts a failure and does not stop the others', async () => {
    // Both requirements would fire; only the maintenance app is reachable.
    seedWorkflow(MAINTENANCE_DUE);
    seedWorkflow(LEASE_EXPIRING);
    const lister = listerFor({
      'home-maintenance.maintenance-tasks': [
        { id: 501, title: 'Replace filter', dueDate: dayOffset(-1), status: 'due', priority: 'high' },
      ],
      // `rental-property.leases` absent → the lister throws, as an unreachable server would.
    });

    const result = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['home-maintenance.due', 'rental-property.lease-expiring'],
      ignoreBackoff: true,
    });

    expect(result.failed).toBe(1);
    expect(result.fired).toBe(1);
    expect(publishedEventTypes()).toEqual([MAINTENANCE_DUE]);

    const health = labRequirementSweepRepository.getHealth('rental-property.lease-expiring');
    expect(health?.consecutiveFailures).toBe(1);
    // Backoff is set, so the next tick skips rather than re-reading a dead server immediately.
    expect(health?.nextAttemptAt).toBeGreaterThan(Date.now());
  });

  test('a requirement with no listening workflow does not read the provider', async () => {
    // No workflow seeded for this type.
    let called = false;
    const lister = (async () => {
      called = true;
      return { records: [], truncated: false };
    }) as unknown as typeof import('@/backend/lab-workflows/lab-workflow-integration-connector-client').listIntegrationRecords;

    const result = await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['home-maintenance.due'],
      ignoreBackoff: true,
    });

    expect(called).toBe(false);
    expect(result.skipped).toBe(1);
  });

  test('the persisted event row exists before a notify node would need it', async () => {
    seedWorkflow(MAINTENANCE_DUE);
    const lister = listerFor({
      'home-maintenance.maintenance-tasks': [
        { id: 601, title: 'Flush tank', dueDate: dayOffset(0), status: 'scheduled' },
      ],
    });

    await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['home-maintenance.due'],
      ignoreBackoff: true,
    });

    // `lab_user_notifications.event_id` is a foreign key into this table, so a missing row here is
    // what makes a notify node fail per recipient while the run reports success.
    const row = db
      .prepare('SELECT id, source_app_id, payload_json FROM lab_domain_events')
      .get() as { id: string; source_app_id: string; payload_json: string } | undefined;
    expect(row).toBeDefined();
    // `sourceAppId` is the provider app, so an author's trigger filter matches.
    expect(row?.source_app_id).toBe('app-home-maintenance');
    expect(JSON.parse(row?.payload_json ?? '{}')).toMatchObject({
      recordId: '601',
      title: 'Flush tank',
      requirementKey: 'home-maintenance.due',
    });

    // The event reached the workflow: a run row exists for the trigger that was listening, which is
    // the difference between "an event was published" and "the author's automation actually ran".
    const runs = db
      .prepare('SELECT trigger_type, status FROM lab_workflow_runs')
      .all() as Array<{ trigger_type: string; status: string }>;
    expect(runs).toHaveLength(1);
    expect(runs[0].trigger_type).toBe('event');
    expect(runs[0].status).not.toBe('failed');
  });

  test('a record whose date moves re-qualifies instead of staying suppressed', async () => {
    // A lease extended into the window is a new fact about the record, not a repeat.
    seedWorkflow(LEASE_EXPIRING);
    const records = [
      { id: 701, tenantName: 'G', endDate: dayOffset(3), status: 'active' },
    ];
    const lister = listerFor({ 'rental-property.leases': records });

    await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(publishedEventTypes()).toHaveLength(1);

    // The lease is extended by 20 days — still inside the window, but a different observed date.
    records[0].endDate = dayOffset(23);
    await labRequirementSweeper.tick({
      now: TODAY,
      lister,
      onlyKeys: ['rental-property.lease-expiring'],
      ignoreBackoff: true,
    });
    expect(publishedEventTypes()).toHaveLength(2);
  });
});
