import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowMockSamplesRepository } from '@/backend/db/LabWorkflows/lab-workflow-mock-samples-repository';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import type { User } from '@/shared/types/user';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import {
  WF_TEST_EDGE_TRIGGER_NOTIFY,
  WF_TEST_NOTIFY,
  WF_TEST_TRIGGER,
} from '../lab-workflow-graph-fixture-ids';

/**
 * W5b — saved mock payloads.
 *
 * The question this answers is "does it work with *this shape* of data?" — the shape the author
 * cannot invent because they have not seen the real one yet. The assertions that matter are that a
 * sample replays identically twice, that a sample cannot escape its own workflow, and that a mocked
 * run is distinguishable from a real one in history.
 */

const WORKFLOW_ID = 'f6000002-0002-4002-8002-0000000000f6';
const OTHER_WORKFLOW_ID = 'f6000003-0003-4003-8003-0000000000f7';
const ASSIGNEE_ID = 2;
const TRIGGER_NODE_ID = WF_TEST_TRIGGER;
const TRIGGER_EVENT = 'app-lab-tasklist.task.created';

const ADMIN: User = {
  userId: 1,
  email: 'a@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function definition(): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: TRIGGER_NODE_ID,
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: TRIGGER_EVENT,
      },
      {
        id: WF_TEST_NOTIFY,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'notify_users', userIds: [], path: 'assigneeId' },
      },
    ],
    edges: [
      { id: WF_TEST_EDGE_TRIGGER_NOTIFY, source: TRIGGER_NODE_ID, target: WF_TEST_NOTIFY, when: 'always' },
    ],
  };
}

function sampleEnvelope(title: string) {
  return {
    schemaVersion: 1,
    id: '88888888-8888-4888-8888-888888888888',
    type: TRIGGER_EVENT,
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId: 1,
    payload: { assigneeId: String(ASSIGNEE_ID), title, priority: 'high' },
  };
}

describe('workflow mock samples (W5b)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, 'b@test', 'Bob', 'member', 'active')`,
    ).run(ASSIGNEE_ID);

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labWorkflowMockSamplesRepository.bootstrap(db);

    for (const id of [WORKFLOW_ID, OTHER_WORKFLOW_ID]) {
      labWorkflowsRepository.insertWorkflow({
        id,
        name: `Fixture ${id.slice(-2)}`,
        description: null,
        scope: 'global',
        ownerUserId: null,
        createdByUserId: 1,
        enabled: false,
        priority: 100,
        definitionJson: JSON.stringify(definition()),
      });
    }
  });

  afterAll(() => {
    db.close();
  });

  function save(name: string, title: string, workflowId = WORKFLOW_ID) {
    return labWorkflowsService.createMockSampleForCaller(ADMIN, workflowId, {
      triggerNodeId: TRIGGER_NODE_ID,
      name,
      envelope: sampleEnvelope(title),
    });
  }

  test('a saved sample is retrievable and carries its envelope verbatim', () => {
    const sample = save('Stripe shape', 'First sample');

    expect(sample.workflowId).toBe(WORKFLOW_ID);
    expect(sample.triggerNodeId).toBe(TRIGGER_NODE_ID);
    expect(sample.name).toBe('Stripe shape');

    const reloaded = labWorkflowMockSamplesRepository.getById(WORKFLOW_ID, sample.id);
    expect(reloaded).not.toBeNull();
    expect(JSON.parse(reloaded!.envelopeJson).payload.title).toBe('First sample');
  });

  test('a sample cannot be read through another workflow', () => {
    const sample = save('Scoped sample', 'Scoped');

    // Scoping is enforced in the repository query, so the service cannot forget to apply it.
    expect(labWorkflowMockSamplesRepository.getById(OTHER_WORKFLOW_ID, sample.id)).toBeNull();
    expect(
      labWorkflowMockSamplesRepository
        .listForWorkflow(OTHER_WORKFLOW_ID)
        .some((row) => row.id === sample.id),
    ).toBe(false);
  });

  test('a sample must be attached to the workflow trigger node', () => {
    expect(() =>
      labWorkflowsService.createMockSampleForCaller(ADMIN, WORKFLOW_ID, {
        triggerNodeId: WF_TEST_NOTIFY,
        name: 'Wrong node',
        envelope: sampleEnvelope('x'),
      }),
    ).toThrow(/triggerNodeId must name the trigger node/);
  });

  test('an invalid envelope is rejected rather than stored unreplayable', () => {
    expect(() =>
      labWorkflowsService.createMockSampleForCaller(ADMIN, WORKFLOW_ID, {
        triggerNodeId: TRIGGER_NODE_ID,
        name: 'No type',
        envelope: { schemaVersion: 1, payload: {} },
      }),
    ).toThrow(/not a valid event envelope/);
  });

  test('a saved sample replays identically twice', async () => {
    const sample = save('Replay me', 'Replayed title');

    const first = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      mockSampleId: sample.id,
    });
    const second = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      mockSampleId: sample.id,
    });

    const detail = (result: typeof first) =>
      result.steps.find((step) => step.nodeId === WF_TEST_NOTIFY)?.detail;
    expect(detail(first)).toEqual(detail(second));
    expect(
      (detail(first)?.wouldSend as { body?: string } | undefined)?.body,
    ).toContain('Replayed title');
  });

  test('a mocked real run is distinguishable from a real one in history', async () => {
    const sample = save('History marker', 'Marked');

    // A real run needs its envelope in lab_domain_events for the notification FK.
    const env = sampleEnvelope('Marked');
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId,
      JSON.stringify(env.payload),
    );

    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: false,
      mockSampleId: sample.id,
    });

    const run = labWorkflowRunsRepository.getRun(result.runId!);
    expect(run?.triggerType).toBe('manual');
    expect(run?.mockSampleId).toBe(sample.id);
  });

  test('a dry mocked run still leaves no run row', async () => {
    const sample = save('Dry mock', 'Dry');
    const before = labWorkflowRunsRepository.listRecentRuns().length;

    const result = await labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
      dryRun: true,
      mockSampleId: sample.id,
    });

    expect(result.runId).toBeNull();
    expect(labWorkflowRunsRepository.listRecentRuns().length).toBe(before);
  });

  test('an unknown sample id is rejected instead of silently using a synthesised envelope', async () => {
    await expect(
      labWorkflowsService.runForCaller(ADMIN, WORKFLOW_ID, {
        dryRun: true,
        mockSampleId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(/Mock sample not found/);
  });

  test('samples are capped per workflow, keeping the newest', () => {
    const workflowId = OTHER_WORKFLOW_ID;
    for (let i = 0; i < 22; i += 1) {
      save(`Sample ${i}`, `Title ${i}`, workflowId);
    }

    const kept = labWorkflowMockSamplesRepository.listForWorkflow(workflowId);
    expect(kept.length).toBeLessThanOrEqual(20);
    // The most recently saved must survive: a cap that discards what you just saved is a bug.
    expect(kept.some((row) => row.name === 'Sample 21')).toBe(true);
    expect(kept.some((row) => row.name === 'Sample 0')).toBe(false);
  });

  test('deleting a sample removes it, and deleting again reports not found', () => {
    const sample = save('Delete me', 'Doomed');

    expect(() =>
      labWorkflowsService.deleteMockSampleForCaller(ADMIN, WORKFLOW_ID, sample.id),
    ).not.toThrow();
    expect(labWorkflowMockSamplesRepository.getById(WORKFLOW_ID, sample.id)).toBeNull();
    expect(() =>
      labWorkflowsService.deleteMockSampleForCaller(ADMIN, WORKFLOW_ID, sample.id),
    ).toThrow(/Mock sample not found/);
  });

  test('a viewer cannot save or delete a sample', () => {
    const sample = save('Read only', 'Readable');
    const viewer: User = { ...ADMIN, userId: 3, role: 'viewer' };

    expect(() =>
      labWorkflowsService.createMockSampleForCaller(viewer, WORKFLOW_ID, {
        triggerNodeId: TRIGGER_NODE_ID,
        name: 'Nope',
        envelope: sampleEnvelope('x'),
      }),
    ).toThrow(/Viewers cannot save mock payloads/);
    expect(() =>
      labWorkflowsService.deleteMockSampleForCaller(viewer, WORKFLOW_ID, sample.id),
    ).toThrow(/Viewers cannot delete mock payloads/);
    // Reading is refused too, but for the pre-existing reason: a viewer cannot read workflows at
    // all (see `listForCaller`). This asserts the sample route inherits that policy rather than
    // opening a second, weaker read path into a workflow a viewer cannot otherwise see.
    expect(() => labWorkflowsService.listMockSamplesForCaller(viewer, WORKFLOW_ID)).toThrow(
      /Cannot read this workflow/,
    );
  });
});
