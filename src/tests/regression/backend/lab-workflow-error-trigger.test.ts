import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import {
  LAB_WORKFLOW_RUN_FAILED_EVENT_TYPE,
  beginWorkflowRun,
} from '@/backend/lab-workflows/lab-workflow-run-recorder';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

/**
 * W11 — the error trigger (T16).
 *
 * A workflow that runs when another fails. The interesting properties are about *not* escalating:
 *
 * - a run that failed records the failure **before** the event is published, so an operator reading
 *   the history sees the run the alert is about;
 * - a failed publish does not un-record the run;
 * - a successful run publishes nothing, because an error workflow firing on success would be noise
 *   indistinguishable from a real incident.
 */

const WORKFLOW_ID = 'e7100012-0012-4012-8012-000000000b01';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

describe('error trigger (W11)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Error-trigger fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
        nodes: [
          { id: 'n-trigger', kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        ],
        edges: [],
      }),
    });
  });

  afterAll(() => {
    db.close();
  });

  function publishedFailedEvents(): { payload: string }[] {
    return db
      .prepare('SELECT payload_json AS payload FROM lab_domain_events WHERE type = ? ORDER BY rowid')
      .all(LAB_WORKFLOW_RUN_FAILED_EVENT_TYPE) as { payload: string }[];
  }

  function clearEvents(): void {
    db.prepare('DELETE FROM lab_domain_events').run();
    db.prepare('DELETE FROM lab_workflow_runs').run();
  }

  test('a failed run publishes a run-failed event', async () => {
    clearEvents();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual' });
    run.finish('failed', 'the node threw');
    // `finish` publishes fire-and-forget; wait one tick for the promise to settle.
    await new Promise((resolve) => setImmediate(resolve));

    const events = publishedFailedEvents();
    expect(events).toHaveLength(1);
    const payload = JSON.parse(events[0]?.payload ?? '{}') as Record<string, unknown>;
    expect(payload).toMatchObject({
      runId: run.id,
      workflowId: WORKFLOW_ID,
      triggerType: 'manual',
      error: 'the node threw',
    });
  });

  test('a successful run publishes nothing', async () => {
    clearEvents();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual' });
    run.finish('succeeded');
    await new Promise((resolve) => setImmediate(resolve));

    // An error workflow that fired on success would be indistinguishable from a real incident.
    expect(publishedFailedEvents()).toHaveLength(0);
  });

  test('a partial run publishes nothing', async () => {
    clearEvents();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual' });
    run.finish('partial');
    await new Promise((resolve) => setImmediate(resolve));
    // "Some nodes were skipped" is normal — a declining rule takes that path. Alerting on it would
    // train users to ignore the alert.
    expect(publishedFailedEvents()).toHaveLength(0);
  });

  test('the failure is recorded before the event exists', async () => {
    clearEvents();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'event' });
    run.finish('failed', 'boom');
    await new Promise((resolve) => setImmediate(resolve));

    const row = db
      .prepare('SELECT status, error FROM lab_workflow_runs WHERE id = ?')
      .get(run.id) as { status: string; error: string } | undefined;
    // The ordering guarantee: a workflow reacting to the failure reads a history where it exists.
    expect(row?.status).toBe('failed');
    expect(row?.error).toBe('boom');
    expect(publishedFailedEvents()).toHaveLength(1);
  });

  test('finishing twice publishes once', async () => {
    clearEvents();
    const run = beginWorkflowRun({ workflowId: WORKFLOW_ID, triggerType: 'manual' });
    run.finish('failed', 'first');
    run.finish('failed', 'second');
    await new Promise((resolve) => setImmediate(resolve));

    // A double `finish` is a caller bug, but it must not page somebody twice.
    expect(publishedFailedEvents()).toHaveLength(1);
  });

  test('the event type is the one an error workflow subscribes to', () => {
    // Guards against a rename silently killing every error workflow: the constant is exported so the
    // catalog and the recorder share one string.
    expect(LAB_WORKFLOW_RUN_FAILED_EVENT_TYPE).toBe('platform-workflows.run.failed');
  });
});
