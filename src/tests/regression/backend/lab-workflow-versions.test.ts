import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import {
  LAB_WORKFLOW_VERSION_RETENTION,
  labWorkflowVersionsRepository,
} from '@/backend/db/LabWorkflows/lab-workflow-versions-repository';
import { LabWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import type { User } from '@/shared/types/user';
import { WF_TEST_TRIGGER, WF_TEST_TRIGGER_B } from '../lab-workflow-graph-fixture-ids';

/**
 * W11 — versions and rollback.
 *
 * The property that matters is that rollback restores **behaviour**, not just JSON. A snapshot that
 * parses but does not evaluate would look restored in the editor and do nothing at run time, so the
 * assertion is on the definition's nodes, and the validation rule is enforced on the way back in.
 */

const WORKFLOW_ID = 'e7000011-0011-4011-8011-000000000a01';
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

function admin(): User {
  return {
    userId: 1,
    email: 'a@test',
    name: 'Admin',
    role: 'admin',
    status: 'active',
  } as User;
}

// The graph schema requires UUID node and edge ids. Stable constants rather than `randomUUID()` so a
// failure diff is readable and `titleOfCurrent()` can find the notify node by name.
const NODE = {
  trigger: 'e7000011-0011-4011-8011-0000000000a1',
  notify: 'e7000011-0011-4011-8011-0000000000a2',
};
const EDGE_TRIGGER_TO_NOTIFY = 'e7000011-0011-4011-8011-0000000000a3';

/** v1: a single notify node titled "one". */
function definitionV1(): Record<string, unknown> {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: NODE.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
      {
        id: NODE.notify,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'notify_users', userIds: [2], message: { title: 'one' } },
      },
    ],
    edges: [{ id: EDGE_TRIGGER_TO_NOTIFY, source: NODE.trigger, target: NODE.notify, when: 'always' }],
  };
}

/** v2: the same graph with a different title, so a rollback is observable. */
function definitionV2(): Record<string, unknown> {
  const base = definitionV1();
  const nodes = base.nodes as { id: string; step?: { message?: { title?: string } } }[];
  const notify = nodes.find((node) => node.id === NODE.notify);
  if (notify?.step?.message) {
    notify.step.message.title = 'two';
  }
  return base;
}

describe('workflow versions (W11)', () => {
  let db: betterSqlite3.Database;
  let service: LabWorkflowsService;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (2, 'u2@test', 'User Two', 'member', 'active')`,
    ).run();

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowVersionsRepository.bootstrap(db);

    service = LabWorkflowsService.getInstance();
  });

  afterAll(() => {
    db.close();
  });

  function givenWorkflow(definition: Record<string, unknown> = definitionV1()): void {
    db.prepare('DELETE FROM lab_workflow_versions').run();
    db.prepare('DELETE FROM lab_workflows').run();
    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Versioned workflow',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify(definition),
    });
  }

  function titleOfCurrent(): string | undefined {
    const row = labWorkflowsRepository.getById(WORKFLOW_ID);
    const nodes = (row?.definition as { nodes?: { id: string; step?: { message?: { title?: string } } }[] })
      .nodes ?? [];
    return nodes.find((node) => node.id === NODE.notify)?.step?.message?.title;
  }

  test('publishing snapshots the current definition', () => {
    givenWorkflow(definitionV1());
    const result = service.publishForCaller(admin(), WORKFLOW_ID, { note: 'first' });

    expect(result.version).toBe(1);
    const versions = service.listVersionsForCaller(admin(), WORKFLOW_ID);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.note).toBe('first');
    expect(versions[0]?.definitionJson).toContain(NODE.notify);
  });

  test('version numbers increase per workflow', () => {
    givenWorkflow(definitionV1());
    expect(service.publishForCaller(admin(), WORKFLOW_ID, {}).version).toBe(1);
    expect(service.publishForCaller(admin(), WORKFLOW_ID, {}).version).toBe(2);
    expect(service.publishForCaller(admin(), WORKFLOW_ID, {}).version).toBe(3);
  });

  test('rollback restores the previous behaviour', () => {
    givenWorkflow(definitionV1());
    const first = service.publishForCaller(admin(), WORKFLOW_ID, {});

    // Move the live graph forward.
    service.updateForCaller(admin(), WORKFLOW_ID, { definition: definitionV2() });
    expect(titleOfCurrent()).toBe('two');

    service.rollbackForCaller(admin(), WORKFLOW_ID, first.id);
    // The observable: the notification title is back to what v1 said.
    expect(titleOfCurrent()).toBe('one');
  });

  test('rollback does not delete the intervening version', () => {
    givenWorkflow(definitionV1());
    const first = service.publishForCaller(admin(), WORKFLOW_ID, {});
    service.updateForCaller(admin(), WORKFLOW_ID, { definition: definitionV2() });
    service.publishForCaller(admin(), WORKFLOW_ID, { note: 'second' });

    service.rollbackForCaller(admin(), WORKFLOW_ID, first.id);

    // A rollback is a change to the live graph, not a truncation of history: the user can roll
    // forward again to the version they just left.
    expect(service.listVersionsForCaller(admin(), WORKFLOW_ID)).toHaveLength(2);
  });

  test('rolling forward again restores v2', () => {
    givenWorkflow(definitionV1());
    const first = service.publishForCaller(admin(), WORKFLOW_ID, {});
    service.updateForCaller(admin(), WORKFLOW_ID, { definition: definitionV2() });
    const second = service.publishForCaller(admin(), WORKFLOW_ID, {});

    service.rollbackForCaller(admin(), WORKFLOW_ID, first.id);
    expect(titleOfCurrent()).toBe('one');
    service.rollbackForCaller(admin(), WORKFLOW_ID, second.id);
    expect(titleOfCurrent()).toBe('two');
  });

  test('rolling back to an unknown version is a 404-style error', () => {
    givenWorkflow();
    expect(() =>
      service.rollbackForCaller(admin(), WORKFLOW_ID, '88000000-0000-4000-8000-000000000000'),
    ).toThrow(/Version not found/);
  });

  test('a viewer cannot publish or roll back', () => {
    givenWorkflow();
    const viewer = { ...admin(), role: 'viewer' } as User;
    expect(() => service.publishForCaller(viewer, WORKFLOW_ID, {})).toThrow(/Viewers cannot publish/);
    expect(() => service.rollbackForCaller(viewer, WORKFLOW_ID, 'x')).toThrow(
      /Viewers cannot roll workflows back/,
    );
  });

  test('the retention cap prunes the oldest versions', () => {
    givenWorkflow();
    for (let index = 0; index < LAB_WORKFLOW_VERSION_RETENTION + 3; index += 1) {
      service.publishForCaller(admin(), WORKFLOW_ID, { note: `v${index}` });
    }
    const versions = labWorkflowVersionsRepository.listForWorkflow(
      WORKFLOW_ID,
      LAB_WORKFLOW_VERSION_RETENTION + 10,
    );
    // A version table nobody prunes is a slow disk leak, and a graph snapshot is not small.
    expect(versions.length).toBeLessThanOrEqual(LAB_WORKFLOW_VERSION_RETENTION);
    // The newest survive: the first prune must not discard what was just published.
    expect(versions[0]?.version).toBe(LAB_WORKFLOW_VERSION_RETENTION + 3);
  });

  test('publishing an invalid graph is refused', () => {
    // A snapshot that cannot be restored is worse than no snapshot: the user would only discover it
    // while trying to recover from a mistake.
    givenWorkflow({
      schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
      nodes: [
        // Two triggers: the shared validator rejects this.
        { id: WF_TEST_TRIGGER, kind: 'trigger', position: { x: 0, y: 0 }, eventType: TRIGGER_EVENT },
        { id: WF_TEST_TRIGGER_B, kind: 'trigger', position: { x: 0, y: 50 }, eventType: TRIGGER_EVENT },
      ],
      edges: [],
    });
    expect(() => service.publishForCaller(admin(), WORKFLOW_ID, {})).toThrow();
  });

  test('versions are scoped to their workflow', () => {
    givenWorkflow();
    const published = service.publishForCaller(admin(), WORKFLOW_ID, {});

    // Requesting the version by id **and** workflow id: a version cannot be read through another
    // workflow's id, which is what stops one workflow's snapshot being used to overwrite another.
    expect(labWorkflowVersionsRepository.findById('dd000000-0000-4000-8000-000000000000', published.id)).toBeNull();
  });
});
