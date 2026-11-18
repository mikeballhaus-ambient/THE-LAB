import { describe, expect, test } from '@jest/globals';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { parseLabDomainEventPublish } from '@/shared/types/schemas/lab-domain-event-schema';

describe('lab-domain-event', () => {
  describe('buildLabEventType', () => {
    test('formats event type as sourceAppId.entity.action', () => {
      expect(buildLabEventType('app-lab-tasklist', 'task', 'created')).toBe(
        'app-lab-tasklist.task.created',
      );
      expect(buildLabEventType('app-notification-hub', 'user', 'alert')).toBe(
        'app-notification-hub.user.alert',
      );
    });
  });

  describe('parseLabDomainEventPublish', () => {
    test('accepts a valid minimal envelope', () => {
      const validInput = {
        schemaVersion: 1,
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'app-lab-tasklist.task.created',
        sourceAppId: 'app-lab-tasklist',
        occurredAt: '2026-10-12T12:00:00.000Z',
        payload: { taskId: 1 },
      };

      const result = parseLabDomainEventPublish(validInput);
      expect(result).toMatchObject(validInput);
    });

    test('rejects incorrect schemaVersion', () => {
      expect(() =>
        parseLabDomainEventPublish({
          schemaVersion: 2,
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'app-lab-tasklist.task.created',
          sourceAppId: 'app-lab-tasklist',
          occurredAt: '2026-10-12T12:00:00.000Z',
          payload: {},
        }),
      ).toThrow();
    });

    test('rejects missing type', () => {
      expect(() =>
        parseLabDomainEventPublish({
          schemaVersion: 1,
          id: '550e8400-e29b-41d4-a716-446655440000',
          sourceAppId: 'app-lab-tasklist',
          occurredAt: '2026-10-12T12:00:00.000Z',
          payload: {},
        }),
      ).toThrow();
    });
  });
});
