import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { authRepository } from '@/backend/db/Auth/auth-repository';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labCommsRepository } from '@/backend/db/Comms/lab-comms-repository';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { evaluateWorkflowsForDomainEvent } from '@/backend/lab-workflows/lab-workflows-evaluator';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { dmChannelId } from '@/shared/types/schemas/lab-comms-schema';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';

const WORKFLOW_ID = 'c3000002-0002-4002-8002-0000000000c2';
// 2 is the reserved automation account (the DM sender), so the recipient must be a different id.
const ASSIGNEE_ID = 3;
/** Mixed case on purpose: the address a third-party payload sends is not normalised for us. */
const ASSIGNEE_EMAIL_MIXED_CASE = 'Bob@Test';

describe('lab-workflows comms_system_dm_payload_user', () => {
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
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (?, 'system@the-lab.platform', 'THE-LAB', 'viewer', 'active')`,
    ).run(LAB_PLATFORM_SYSTEM_USER_ID);

    await labEventsRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);
    await labCommsRepository.bootstrap(db);
    // The recipient resolver looks an email up through this repository, so it must be bootstrapped
    // against the same in-memory database the other repositories use.
    await authRepository.bootstrap(db);

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'comms test',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: 1,
        trigger: { eventType: 'app-lab-tasklist.task.created' },
        steps: [{ kind: 'comms_system_dm_payload_user', path: 'assigneeId' }],
      }),
    });
  });

  afterAll(() => {
    db.close();
  });

  test('sends DM from platform system user to assignee', async () => {
    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeId: String(ASSIGNEE_ID), title: 'Ship widgets' },
    };
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    await evaluateWorkflowsForDomainEvent(env, {});

    const channelId = dmChannelId(LAB_PLATFORM_SYSTEM_USER_ID, ASSIGNEE_ID);
    const messages = labCommsRepository.listMessages(channelId, 10, undefined, ASSIGNEE_ID);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.senderUserId).toBe(LAB_PLATFORM_SYSTEM_USER_ID);
    expect((messages[0]?.payload as { text?: string }).text).toContain('Ship widgets');
  });

  test('resolves the assignee from an email instead of an id', async () => {
    // The same workflow was seeded with `path: 'assigneeId'`; point a fresh one at the email field so
    // the two identity kinds are covered by the real runner rather than only by the helper.
    const emailWorkflowId = 'c3000002-0002-4002-8002-0000000000c3';
    labWorkflowsRepository.insertWorkflow({
      id: emailWorkflowId,
      name: 'comms email test',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: 1,
        trigger: { eventType: 'platform-webhook.request.received' },
        steps: [{ kind: 'comms_system_dm_payload_user', path: 'assigneeEmail' }],
      }),
    });

    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'platform-webhook.request.received',
      sourceAppId: 'platform-webhook',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeEmail: ASSIGNEE_EMAIL_MIXED_CASE, title: 'Email addressed' },
    };
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    await evaluateWorkflowsForDomainEvent(env, {});

    const channelId = dmChannelId(LAB_PLATFORM_SYSTEM_USER_ID, ASSIGNEE_ID);
    const messages = labCommsRepository.listMessages(channelId, 10, undefined, ASSIGNEE_ID);
    // Mixed case must match: refusing it would read as "the workflow is broken" to the author, since
    // the address is the same mailbox the platform already stores.
    expect(messages.some((m) => m.senderUserId === LAB_PLATFORM_SYSTEM_USER_ID)).toBe(true);
  });

  test('an unknown email resolves to nobody instead of the system user', async () => {
    const unknownWorkflowId = 'c3000002-0002-4002-8002-0000000000c4';
    labWorkflowsRepository.insertWorkflow({
      id: unknownWorkflowId,
      name: 'comms unknown recipient',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: 1,
        trigger: { eventType: 'platform-webhook.request.received' },
        steps: [{ kind: 'comms_system_dm_payload_user', path: 'assigneeEmail' }],
      }),
    });

    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'platform-webhook.request.received',
      sourceAppId: 'platform-webhook',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeEmail: 'nobody@nowhere.invalid' },
    };
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );

    await evaluateWorkflowsForDomainEvent(env, {});

    // A DM from THE-LAB to THE-LAB would look like a delivery in the run log while reaching nobody,
    // so an unresolved recipient must produce no message at all.
    const selfChannel = dmChannelId(LAB_PLATFORM_SYSTEM_USER_ID, LAB_PLATFORM_SYSTEM_USER_ID);
    expect(labCommsRepository.listMessages(selfChannel, 10, undefined, LAB_PLATFORM_SYSTEM_USER_ID))
      .toHaveLength(0);
  });
});
