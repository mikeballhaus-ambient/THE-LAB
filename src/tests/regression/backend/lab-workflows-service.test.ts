import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import type { User } from '@/shared/types/user';

const member: User = {
  userId: 2,
  email: 'm@test',
  name: 'Member',
  role: 'member',
  status: 'active',
  lastSeen: '2020-01-01T00:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
  permissions: { global: {} },
};

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

describe('lab-workflows service', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (2, 'm@test', 'Member', 'member', 'active')`,
    ).run();
    await labWorkflowsRepository.bootstrap(db);
  });

  beforeEach(() => {
    labWorkflowsRepository.clearAllWorkflowsForTests();
  });

  afterAll(() => {
    labWorkflowsRepository.close();
    db.close();
  });

  test('member lists only own user workflows', () => {
    labWorkflowsService.createForCaller(member, {
      id: randomUUID(),
      name: 'mine',
      scope: 'user',
      ownerUserId: 2,
      enabled: true,
      priority: 10,
      definition: {
        schemaVersion: 1,
        trigger: { eventType: 'app-lab-tasklist.task.created' },
        steps: [{ kind: 'notify_users', userIds: [2] }],
      },
    });

    labWorkflowsService.createForCaller(admin, {
      id: randomUUID(),
      name: 'global',
      scope: 'global',
      enabled: true,
      priority: 5,
      definition: {
        schemaVersion: 1,
        trigger: { eventType: 'app-lab-tasklist.task.created' },
        steps: [{ kind: 'notify_users', userIds: [1] }],
      },
    });

    const memberList = labWorkflowsService.listForCaller(member);
    expect(memberList).toHaveLength(1);
    expect(memberList[0]?.name).toBe('mine');
  });
});
