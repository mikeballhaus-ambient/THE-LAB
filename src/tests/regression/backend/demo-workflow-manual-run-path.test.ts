import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import type { User } from '@/shared/types/user';
import { buildDemoTaskAssigneeWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-task-assignee';

const ADMIN: User = {
  userId: 1,
  email: 'a@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

/** Stable id for manual-run regression (not part of the seeded demo pack). */
const MANUAL_RUN_TASK_ASSIGN_WORKFLOW_ID = 'a1000002-0002-4002-8002-000000000030';

describe('demo workflow manual dry run (assigned task sample)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (2, 'b@test', 'Mia', 'member', 'active')`,
    ).run();

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: MANUAL_RUN_TASK_ASSIGN_WORKFLOW_ID,
      name: 'Demo: route new tasks',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 200,
      definitionJson: JSON.stringify(buildDemoTaskAssigneeWorkflowDefinition()),
    });
  });

  afterAll(() => {
    db.close();
  });

  test('assigned task walks assignee IF to notify assignee', async () => {
    const result = await labWorkflowsService.runForCaller(ADMIN, MANUAL_RUN_TASK_ASSIGN_WORKFLOW_ID, {
      dryRun: true,
      envelope: {
        schemaVersion: 1,
        id: randomUUID(),
        type: 'app-lab-tasklist.task.created',
        sourceAppId: 'app-lab-tasklist',
        occurredAt: new Date().toISOString(),
        actorUserId: 1,
        payload: {
          taskId: 'sample-task-1002',
          title: 'Sample — assigned task',
          assigneeId: 2,
          priority: 'medium',
        },
      },
    });

    expect(result.status).toBe('succeeded');
    const trigger = result.steps.find((step) => step.nodeKind === 'trigger');
    expect(trigger?.detail?.sampleFields).toMatchObject({
      assigneeId: '2',
    });

    const assigneeIf = result.steps.find((step) => step.nodeId.endsWith('000000000033'));
    expect(assigneeIf?.detail).toMatchObject({ matched: true, trueCount: 1 });

    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });
});
