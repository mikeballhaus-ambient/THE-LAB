import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labApprovalsRepository } from '@/backend/db/LabApprovals/lab-approvals-repository';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labRulesRepository } from '@/backend/db/LabRules/lab-rules-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labApprovalsService } from '@/backend/db/LabApprovals/lab-approvals-service';
import type { User } from '@/shared/types/user';

const admin: User = {
  userId: 1,
  email: 'a@test',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

const approver: User = {
  userId: 2,
  email: 'b@test',
  name: 'Approver',
  role: 'member',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

const requester: User = {
  userId: 3,
  email: 'c@test',
  name: 'Requester',
  role: 'member',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

describe('lab-approvals service', () => {
  let db: betterSqlite3.Database;
  let policyId: string;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    for (const u of [admin, approver, requester]) {
      db.prepare(
        `INSERT INTO users (id, email, name, role, status) VALUES (?, ?, ?, ?, 'active')`,
      ).run(u.userId, u.email, u.name, u.role);
    }
    await labApprovalsRepository.bootstrap(db);
    await labEventsRepository.bootstrap(db);
    await labEventsRepository.initialize();
    await labRulesRepository.bootstrap(db);
    await labRulesRepository.initialize();
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowsRepository.initialize();
    policyId = randomUUID();
    labApprovalsService.createPolicyForCaller(admin, {
      id: policyId,
      name: 'Two-step',
      enabled: true,
      definition: {
        schemaVersion: 1,
        steps: [
          { assigneeUserId: 2 },
          { assigneeUserId: 1 },
        ],
      },
    });
  });

  beforeEach(() => {
    labApprovalsRepository.clearAllForTests();
    policyId = randomUUID();
    labApprovalsService.createPolicyForCaller(admin, {
      id: policyId,
      name: 'Two-step',
      enabled: true,
      definition: {
        schemaVersion: 1,
        steps: [{ assigneeUserId: 2 }, { assigneeUserId: 1 }],
      },
    });
  });

  afterAll(() => {
    labApprovalsRepository.close();
    db.close();
  });

  test('approve advances to approved when single step policy', async () => {
    const singlePolicyId = randomUUID();
    labApprovalsService.createPolicyForCaller(admin, {
      id: singlePolicyId,
      name: 'One',
      enabled: true,
      definition: { schemaVersion: 1, steps: [{ assigneeUserId: 2 }] },
    });
    const requestId = randomUUID();
    await labApprovalsService.createRequestForCaller(requester, {
      id: requestId,
      policyId: singlePolicyId,
      title: 'Test',
      subjectAppId: 'app-x',
      subjectEntityType: 'item',
      subjectEntityId: '1',
      notifyAssignees: false,
    });
    const decided = await labApprovalsService.decideForCaller(approver, requestId, {
      decision: 'approve',
    });
    expect(decided.status).toBe('approved');
  });
});
