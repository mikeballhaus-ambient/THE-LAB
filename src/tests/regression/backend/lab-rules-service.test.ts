import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labRulesRepository } from '@/backend/db/LabRules/lab-rules-repository';
import { labRulesService } from '@/backend/db/LabRules/lab-rules-service';
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

describe('lab-rules service', () => {
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
    await labRulesRepository.bootstrap(db);
  });

  beforeEach(() => {
    labRulesRepository.clearAllRulesForTests();
  });

  afterAll(() => {
    labRulesRepository.close();
    db.close();
  });

  test('member lists only own user rules', () => {
    const id = randomUUID();
    labRulesService.createForCaller(member, {
      id,
      name: 'mine',
      scope: 'user',
      ownerUserId: 2,
      enabled: true,
      priority: 10,
      definition: {
        schemaVersion: 2,
        trigger: { eventTypes: ['app-lab-tasklist.task.created'] },
      },
    });

    labRulesService.createForCaller(admin, {
      id: randomUUID(),
      name: 'global',
      scope: 'global',
      enabled: true,
      priority: 5,
      definition: {
        schemaVersion: 2,
        trigger: { eventTypes: ['app-lab-tasklist.task.created'] },
      },
    });

    const memberList = labRulesService.listForCaller(member);
    expect(memberList).toHaveLength(1);
    expect(memberList[0].id).toBe(id);
  });
});
