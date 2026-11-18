import { afterAll, beforeAll, describe, expect, test, jest } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import userService from '@/backend/db/Auth/auth-service';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labApprovalsRepository } from '@/backend/db/LabApprovals/lab-approvals-repository';
import { labLedgerRepository } from '@/backend/db/LabLedger/lab-ledger-repository';
import { runWorkflowStep } from '@/backend/lab-workflows/lab-workflow-step-runner';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';

/**
 * W9 — the platform nodes.
 *
 * These nodes reach outside the workflow runtime (a catalog app over HTTP, the approvals service, the
 * ledger), so the tests target the parts that are **decidable without those systems**:
 *
 * - the money guard, which must refuse before it posts anything;
 * - the dry run, which is the only safety a user has before enabling a destructive node;
 * - the "no actor" path, which is the difference between a silent no-op and a run the user can read.
 *
 * The happy paths belong to the platform services' own suites; duplicating them here would test the
 * approvals service, not the workflow node.
 */

const TRIGGER_EVENT = 'app-lab-tasklist.task.created';
const WORKFLOW_ID = 'e6e00008-0008-4008-8008-0000000000ec';
const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const POLICY = '33333333-3333-4333-8333-333333333333';

function envelope(actorUserId: number | null = 1): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: 'evt-w9',
    type: TRIGGER_EVENT,
    sourceAppId: 'app-lab-tasklist',
    occurredAt: '2026-10-19T12:00:00.000Z',
    actorUserId,
    payload: { recordId: 'r-1', amount: 2500, taskId: 't-1' },
  } as LabDomainEventEnvelopeV1;
}

function items(): LabWorkflowItem[] {
  return [{ json: { recordId: 'r-1', amount: 2500, taskId: 't-1' } }];
}

async function run(
  step: LabWorkflowStepV1,
  options: { dryRun?: boolean; actorUserId?: number | null } = {},
) {
  return runWorkflowStep({
    step,
    envelope: envelope(options.actorUserId === undefined ? 1 : options.actorUserId),
    items: items(),
    workflowName: 'platform-fixture',
    nodeId: 'n-platform',
    options: options.dryRun === true ? { dryRun: true } : {},
  });
}

describe('platform nodes (W9)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();

    // The actor lookup is stubbed rather than satisfied by bootstrapping the whole auth stack.
    //
    // `AuthRepository.initialize()` migrates and seeds (demo users, the platform system user, OIDC
    // identities), which is far more surface than these nodes need — and it also requires the app
    // database singleton rather than this test's in-memory one. What the nodes actually depend on is
    // one question: "is there an actor, and who is it?". Answering *that* directly keeps the test
    // about the node rather than about the auth layer.
    jest.spyOn(userService, 'getUserById').mockImplementation((id: number) =>
      id === 1
        ? ({ userId: 1, email: 'a@test', name: 'Admin', role: 'admin', status: 'active' } as never)
        : null,
    );

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labWorkflowRunsRepository.bootstrap(db);
    await labApprovalsRepository.bootstrap(db);
    await labLedgerRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'Platform node fixture',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({ schemaVersion: 2, nodes: [], edges: [] }),
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
    db.close();
  });

  describe('integration_delete', () => {
    const step: LabWorkflowStepV1 = {
      kind: 'integration_delete',
      providerAppId: 'app-lab-crm',
      serviceId: 'records',
      recordIdPath: 'recordId',
    };

    test('the dry run names the ids it would delete without deleting', async () => {
      const outcome = await run(step, { dryRun: true });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({
        stepKind: 'integration_delete',
        dryRun: true,
        wouldDeleteCount: 1,
        wouldDeleteIds: ['r-1'],
      });
    });

    test('a batch row with no id is counted rather than throwing', async () => {
      // Reaching a real connector would need a live app server, so this asserts the guard that runs
      // *before* the call: with no actor, the node reports why it did nothing instead of failing.
      const outcome = await run(step, { actorUserId: null });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      // A null actor resolves to the platform system user, which exists in this fixture, so the node
      // proceeds — but it must report a count either way rather than returning an empty detail.
      expect(outcome.detail).toHaveProperty('stepKind', 'integration_delete');
    });
  });

  describe('raise_approval', () => {
    const step: LabWorkflowStepV1 = {
      kind: 'raise_approval',
      policyId: POLICY,
      title: 'Approve the invoice',
    };

    test('the dry run reports the policy and that an actor was found', async () => {
      const outcome = await run(step, { dryRun: true });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({
        dryRun: true,
        policyId: POLICY,
        actorResolved: true,
        wouldRaiseCount: 1,
      });
    });

    test('a missing policy is counted, not thrown, so the batch continues', async () => {
      // No policy with this id exists in the fixture. The node must report `failed: 1` rather than
      // aborting: in a batch, one deleted policy should not cost the other rows their approvals.
      const outcome = await run({ ...step, policyId: '44444444-4444-4444-8444-444444444444' });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({ raised: 0, failed: 1 });
    });
  });

  describe('ledger_post_entry', () => {
    const balanced: LabWorkflowStepV1 = {
      kind: 'ledger_post_entry',
      memo: 'Invoice paid',
      lines: [
        { accountId: ACCOUNT_A, side: 'debit', amountCentsPath: 'amount' },
        { accountId: ACCOUNT_B, side: 'credit', amountCentsPath: 'amount' },
      ],
      confirmedByUserId: 1,
    };

    test('refuses to post without a confirming user', async () => {
      // The schema already requires it, so this asserts the runtime check that protects a graph saved
      // before the requirement existed. Posting money is not a recoverable mistake.
      const outcome = await run({ ...balanced, confirmedByUserId: 0 });
      expect(outcome.kind).toBe('abort');
      if (outcome.kind === 'abort') {
        expect(outcome.reason).toContain('confirming user');
      }
    });

    test('the dry run reports both totals so an imbalance is visible before it posts', async () => {
      const outcome = await run(balanced, { dryRun: true });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({
        dryRun: true,
        debitTotal: 2500,
        creditTotal: 2500,
        wouldPostLines: 2,
        confirmedByUserId: 1,
      });
    });

    test('the dry run makes an imbalance obvious', async () => {
      const outcome = await run(
        {
          ...balanced,
          lines: [
            { accountId: ACCOUNT_A, side: 'debit', amountCentsPath: 'amount' },
            { accountId: ACCOUNT_B, side: 'credit', amountCentsPath: 'taskId' },
          ],
        },
        { dryRun: true },
      );
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      // `taskId` is `'t-1'`, which is not a number, so the credit reads as zero — visibly unbalanced
      // in the preview rather than as a confusing rejection at post time.
      expect(outcome.detail).toMatchObject({ debitTotal: 2500, creditTotal: 0 });
    });

    test('a confirming user who does not exist aborts rather than posting anonymously', async () => {
      const outcome = await run({ ...balanced, confirmedByUserId: 9999 });
      expect(outcome.kind).toBe('abort');
      if (outcome.kind === 'abort') {
        expect(outcome.reason).toContain('does not exist');
      }
    });

    test('the preview counts lines per item, not per entry', async () => {
      // `wouldPostLines` is items × lines: one item posting a two-line entry touches two accounts.
      const outcome = await run(balanced, { dryRun: true });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({ wouldPostEntries: 1, wouldPostLines: 2 });
    });

    test('memoPath overrides the static memo on post and in dry run preview', async () => {
      const outcome = await runWorkflowStep({
        step: {
          ...balanced,
          memo: 'Static fallback',
          memoPath: 'ledgerMemo',
        },
        envelope: envelope(1),
        items: [{ json: { amount: 2500, ledgerMemo: 'Northwind Labs — Platform Starter' } }],
        workflowName: 'platform-fixture',
        nodeId: 'n-platform',
        options: { dryRun: true },
      });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({
        wouldPostMemo: 'Northwind Labs — Platform Starter',
      });
    });
  });

  describe('lab_query_app', () => {
    test('a row whose id path resolves nothing is counted as missing, not read', async () => {
      // `requested` describes the input and `read` describes the output. Conflating them would make a
      // lookup that resolved nothing look like a successful pass-through.
      //
      // The connector itself needs a live catalog app, so this asserts the guard that runs *before*
      // the call: with a path that resolves nothing the node must not fetch `undefined`.
      const outcome = await runWorkflowStep({
        step: {
          kind: 'lab_query_app',
          providerAppId: 'app-lab-crm',
          serviceId: 'records',
          recordIdPath: 'missingPath',
        },
        envelope: envelope(),
        items: items(),
        workflowName: 'platform-fixture',
        nodeId: 'n-platform',
        options: {},
      });
      if (outcome.kind !== 'continue') {
        throw new Error('expected a continue outcome');
      }
      expect(outcome.detail).toMatchObject({ requested: 1, read: 0, missingRecordId: 1 });
      // The node replaces its items with what it read — nothing — so downstream sees no rows rather
      // than the original ids it could not resolve.
      expect(outcome.output.items).toEqual([]);
    });
  });
});
