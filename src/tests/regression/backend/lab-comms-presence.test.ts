import { afterEach, describe, expect, test } from '@jest/globals';
import {
  presenceStateForUser,
  presenceStatusForUser,
  recordActivity,
  removePresenceSocket,
  resetLabCommsPresence,
  touchPresence,
} from '@/backend/comms/lab-comms-presence';
import { LAB_COMMS_PRESENCE_IDLE_MS } from '@/shared/types/lab-comms';

describe('lab-comms presence', () => {
  afterEach(() => {
    resetLabCommsPresence();
  });

  test('connected user is green when recently active', () => {
    touchPresence(5, 'sock-1');
    expect(presenceStatusForUser(5)).toBe('green');
  });

  test('idle connected user is yellow', () => {
    touchPresence(5, 'sock-1');
    const idleNow = Date.now() + LAB_COMMS_PRESENCE_IDLE_MS + 1;
    expect(presenceStatusForUser(5, idleNow)).toBe('yellow');
  });

  test('disconnect removes presence', () => {
    touchPresence(5, 'sock-1');
    removePresenceSocket(5, 'sock-1');
    expect(presenceStatusForUser(5)).toBe('red');
    expect(presenceStateForUser(5).lastActivityAt).toBeNull();
  });

  test('activity refresh keeps green under idle threshold', () => {
    touchPresence(5, 'sock-1');
    const almostIdle = Date.now() + LAB_COMMS_PRESENCE_IDLE_MS - 1000;
    recordActivity(5);
    expect(presenceStatusForUser(5, almostIdle)).toBe('green');
  });
});
