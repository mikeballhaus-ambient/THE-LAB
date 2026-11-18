import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labRulesRepository } from '@/backend/db/LabRules/lab-rules-repository';
import { labWorkflowsRepository } from '@/backend/db/LabWorkflows/lab-workflows-repository';
import { evaluateWorkflowsForDomainEvent } from '@/backend/lab-workflows/lab-workflows-evaluator';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';

const RULE_ID = 'b2000001-0001-4001-8001-0000000000a1';
const WORKFLOW_ID = 'b2000002-0002-4002-8002-0000000000a2';

describe('lab-workflows rule_ref', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Admin', 'admin', 'active')`,
    ).run();
    await labEventsRepository.bootstrap(db);
    await labRulesRepository.bootstrap(db);
    await labWorkflowsRepository.bootstrap(db);

    labRulesRepository.insertRule({
      id: RULE_ID,
      name: 'assignee gate',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: 2,
        trigger: { eventTypes: ['app-lab-tasklist.task.created'] },
        conditions: [{ kind: 'payload_equals', path: 'assigneeId', value: '@me' }],
      }),
    });

    labWorkflowsRepository.insertWorkflow({
      id: WORKFLOW_ID,
      name: 'wf',
      description: null,
      scope: 'global',
      ownerUserId: null,
      createdByUserId: 1,
      enabled: true,
      priority: 100,
      definitionJson: JSON.stringify({
        schemaVersion: 1,
        trigger: { eventType: 'app-lab-tasklist.task.created' },
        steps: [
          { kind: 'rule_ref', ruleId: RULE_ID },
          { kind: 'notify_users', userIds: [1] },
        ],
      }),
    });
  });

  afterAll(() => {
    db.close();
  });

  async function envelope(assigneeId: number | null): Promise<LabDomainEventEnvelopeV1> {
    const env: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      actorUserId: 1,
      payload: { assigneeId },
    };
    await labEventsRepository.publishEvent(
      env.id,
      env.type,
      env.sourceAppId,
      env.occurredAt,
      env.actorUserId ?? null,
      JSON.stringify(env.payload),
    );
    return env;
  }

  test('rule_ref abort skips later notify when rule does not match', async () => {
    const env = await envelope(null);
    await evaluateWorkflowsForDomainEvent(env, {});
    const rows = db.prepare('SELECT * FROM lab_user_notifications WHERE user_id = 1').all();
    expect(rows).toHaveLength(0);
  });

  test('rule_ref match runs subsequent steps', async () => {
    const env = await envelope(1);
    await evaluateWorkflowsForDomainEvent(env, {});
    const rows = db.prepare('SELECT * FROM lab_user_notifications WHERE user_id = 1').all();
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
