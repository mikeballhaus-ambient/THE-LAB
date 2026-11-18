import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { labEventsService } from '@/backend/db/LabEvents/lab-events-service';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';

describe('lab-events service', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Alice', 'owner', 'active')`,
    ).run();
    await labEventsRepository.bootstrap(db);
  });

  beforeEach(() => {
    labEventsRepository.clearAllEventDataForTests();
  });

  afterAll(() => {
    labEventsRepository.close();
    db.close();
  });

  function seedNotification(eventId: string, userId: number, notificationId: string): void {
    labEventsRepository.insertNotification(
      notificationId,
      userId,
      eventId,
      'TEST TITLE',
      'Test body',
      null,
    );
  }

  test('publish persists event only (no inbox rows)', async () => {
    const envelope: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 123 },
    };

    const result = await labEventsService.publish(envelope, 1);
    expect(result.eventId).toBe(envelope.id);

    const notifications = await labEventsService.listNotificationsForUser(1);
    expect(notifications).toHaveLength(0);
  });

  test('listNotificationsForUser respects limit', async () => {
    const envelope1: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date(Date.now() - 2000).toISOString(),
      payload: {},
    };

    const envelope2: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.updated',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      payload: {},
    };

    await labEventsService.publish(envelope1, 1);
    await labEventsService.publish(envelope2, 1);
    seedNotification(envelope1.id, 1, 'n1');
    seedNotification(envelope2.id, 1, 'n2');

    const all = await labEventsService.listNotificationsForUser(1);
    expect(all).toHaveLength(2);

    const firstPage = await labEventsService.listNotificationsForUser(1, 1);
    expect(firstPage).toHaveLength(1);
    expect(firstPage[0].eventId).toBe(envelope2.id);
  });

  test('markNotificationRead updates read_at timestamp', async () => {
    const envelope: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date().toISOString(),
      payload: {},
    };

    await labEventsService.publish(envelope, 1);
    seedNotification(envelope.id, 1, 'n-read');

    const notifications = await labEventsService.listNotificationsForUser(1);
    const notification = notifications[0];

    await labEventsService.markNotificationRead(1, notification.id);

    const updated = await labEventsService.listNotificationsForUser(1);
    expect(updated[0].readAt).toBeDefined();
  });

  test('listRecentEventsForAdmin returns events ordered by occurred_at DESC', async () => {
    const envelope1: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-lab-tasklist.task.created',
      sourceAppId: 'app-lab-tasklist',
      occurredAt: new Date(Date.now() - 2000).toISOString(),
      payload: {},
    };

    const envelope2: LabDomainEventEnvelopeV1 = {
      schemaVersion: 1,
      id: randomUUID(),
      type: 'app-notification-hub.user.alert',
      sourceAppId: 'app-notification-hub',
      occurredAt: new Date().toISOString(),
      payload: {},
    };

    await labEventsService.publish(envelope1, 1);
    await labEventsService.publish(envelope2, 1);

    const events = await labEventsService.listRecentEventsForAdmin(10);
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe(envelope2.id);
    expect(events[1].id).toBe(envelope1.id);
  });
});
