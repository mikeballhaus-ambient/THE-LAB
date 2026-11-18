import { describe, expect, test } from '@jest/globals';
import {
  conditionsMatch,
  conditionsMatchAsync,
  eventTypeMatches,
  getPayloadValue,
} from '@/backend/lab-rules/lab-rules-match';

describe('lab-rules-match', () => {
  test('eventTypeMatches suffix wildcard', () => {
    expect(eventTypeMatches('app-lab-tasklist.task.*', 'app-lab-tasklist.task.created')).toBe(true);
    expect(eventTypeMatches('app-lab-tasklist.task.*', 'app-lab-tasklist.other.created')).toBe(false);
    expect(eventTypeMatches('app-lab-tasklist.task.created', 'app-lab-tasklist.task.created')).toBe(true);
  });

  test('getPayloadValue walks payload', () => {
    expect(getPayloadValue({ assigneeId: 2 }, 'assigneeId')).toBe(2);
  });

  test('conditionsMatch payload_equals', () => {
    expect(
      conditionsMatch(
        [{ kind: 'payload_equals', path: 'status', value: 'open' }],
        { status: 'open' },
      ),
    ).toBe(true);
  });

  test('conditionsMatch coerces numeric payload to string rule value', () => {
    expect(
      conditionsMatch(
        [{ kind: 'payload_equals', path: 'assigneeId', value: '2' }],
        { assigneeId: 2 },
      ),
    ).toBe(true);
  });

  test('@me resolves to rule owner for user scope', () => {
    expect(
      conditionsMatch(
        [{ kind: 'payload_equals', path: 'assigneeId', value: '@me' }],
        { assigneeId: '7' },
        { scope: 'user', ownerUserId: 7 },
      ),
    ).toBe(true);
    expect(
      conditionsMatch(
        [{ kind: 'payload_equals', path: 'assigneeId', value: '@me' }],
        { assigneeId: 8 },
        { scope: 'user', ownerUserId: 7 },
      ),
    ).toBe(false);
  });

  test('@me on global scope uses user id at the same payload path', () => {
    expect(
      conditionsMatch(
        [{ kind: 'payload_equals', path: 'assigneeId', value: '@me' }],
        { assigneeId: 42 },
        { scope: 'global', ownerUserId: null },
      ),
    ).toBe(true);
    expect(
      conditionsMatch(
        [{ kind: 'payload_equals', path: 'assigneeId', value: '@me' }],
        { assigneeId: null },
        { scope: 'global', ownerUserId: null },
      ),
    ).toBe(false);
  });

  test('conditionsMatchAsync lookup_field_equals', async () => {
    const ok = await conditionsMatchAsync(
      [
        {
          kind: 'lookup_field_equals',
          providerAppId: 'app-lab-tasklist',
          serviceId: 'task-list.tasks',
          recordIdPath: 'taskId',
          field: 'status',
          value: 'open',
        },
      ],
      { taskId: 9 },
      undefined,
      {
        actorUser: {
          userId: 1,
          role: 'admin',
          email: 'a@b.c',
          name: 'A',
          status: 'active',
          lastSeen: '2020-01-01T00:00:00.000Z',
          createdAt: '2020-01-01T00:00:00.000Z',
          permissions: {},
        },
        fetchRecord: async () => ({ status: 'open' }),
      },
    );
    expect(ok).toBe(true);
  });
});
