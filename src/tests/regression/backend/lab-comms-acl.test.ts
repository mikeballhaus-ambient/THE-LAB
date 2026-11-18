import { describe, expect, test } from '@jest/globals';
import { canSubscribe } from '@/backend/comms/lab-comms-acl';

describe('lab-comms ACL', () => {
  test('user inbox channel is only subscribable by that user', () => {
    expect(canSubscribe(1, 'user:1')).toBe(true);
    expect(canSubscribe(2, 'user:1')).toBe(false);
  });

  test('dm channel subscribable only by participants', () => {
    expect(canSubscribe(3, 'dm:1:3')).toBe(true);
    expect(canSubscribe(1, 'dm:1:3')).toBe(true);
    expect(canSubscribe(9, 'dm:1:3')).toBe(false);
  });

  test('rejects invalid channel ids', () => {
    expect(canSubscribe(1, 'dm:9:3')).toBe(false);
    expect(canSubscribe(1, 'not-a-channel')).toBe(false);
  });
});
