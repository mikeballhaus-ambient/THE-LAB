import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labLedgerRepository } from '@/backend/db/LabLedger/lab-ledger-repository';
import { labLedgerService } from '@/backend/db/LabLedger/lab-ledger-service';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labRulesRepository } from '@/backend/db/LabRules/lab-rules-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
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

describe('lab-ledger service', () => {
  let db: betterSqlite3.Database;
  let cashId: string;
  let expenseId: string;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(`INSERT INTO users (id, email, name, role, status) VALUES (2, 'm@test', 'M', 'member', 'active')`).run();
    await labLedgerRepository.bootstrap(db);
    await labLedgerRepository.initialize();
    await labEventsRepository.bootstrap(db);
    await labEventsRepository.initialize();
    await labRulesRepository.bootstrap(db);
    await labRulesRepository.initialize();
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowsRepository.initialize();
    const accounts = labLedgerRepository.listAccounts();
    cashId = accounts.find((a) => a.code === '1000')!.id;
    expenseId = accounts.find((a) => a.code === '5000')!.id;
  });

  beforeEach(() => {
    labLedgerRepository.clearAllForTests();
    labLedgerRepository.initialize();
    const accounts = labLedgerRepository.listAccounts();
    cashId = accounts.find((a) => a.code === '1000')!.id;
    expenseId = accounts.find((a) => a.code === '5000')!.id;
  });

  afterAll(() => {
    labLedgerRepository.close();
    db.close();
  });

  test('rejects unbalanced entry', async () => {
    await expect(
      labLedgerService.postEntryForCaller(member, {
        id: randomUUID(),
        lines: [
          { accountId: cashId, side: 'debit', amountCents: 100 },
          { accountId: expenseId, side: 'credit', amountCents: 50 },
        ],
      }),
    ).rejects.toThrow();
  });

  test('posts balanced entry and updates balances', async () => {
    const entry = await labLedgerService.postEntryForCaller(member, {
      id: randomUUID(),
      memo: 'Test',
      lines: [
        { accountId: expenseId, side: 'debit', amountCents: 2500 },
        { accountId: cashId, side: 'credit', amountCents: 2500 },
      ],
    });
    expect(entry.lines).toHaveLength(2);
    const cash = labLedgerRepository.getAccountById(cashId)!;
    const expense = labLedgerRepository.getAccountById(expenseId)!;
    expect(cash.balanceCents).toBe(-2500);
    expect(expense.balanceCents).toBe(2500);
  });
});
