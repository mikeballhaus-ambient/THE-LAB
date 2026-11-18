import { describe, expect, test } from '@jest/globals';
import { dmChannelId, parseChannelId } from '@/shared/types/schemas/lab-comms-schema';

describe('lab-comms channel helpers', () => {
  test('dmChannelId orders lower user id first', () => {
    expect(dmChannelId(5, 12)).toBe('dm:5:12');
    expect(dmChannelId(12, 5)).toBe('dm:5:12');
  });

  test('dmChannelId rejects invalid ids', () => {
    expect(() => dmChannelId(0, 2)).toThrow();
    expect(() => dmChannelId(1.5, 2)).toThrow();
  });

  test('parseChannelId accepts dm, user, and room channels', () => {
    expect(parseChannelId('dm:1:2')).toEqual({
      kind: 'dm',
      channelId: 'dm:1:2',
      userLo: 1,
      userHi: 2,
    });
    expect(parseChannelId('user:42')).toEqual({
      kind: 'user',
      channelId: 'user:42',
      userId: 42,
    });
    expect(parseChannelId('room:550e8400-e29b-41d4-a716-446655440000')?.kind).toBe('room');
  });

  test('parseChannelId rejects non-canonical dm ordering', () => {
    expect(parseChannelId('dm:9:3')).toBeNull();
  });

  test('parseChannelId rejects unknown shapes', () => {
    expect(parseChannelId('dm:1')).toBeNull();
    expect(parseChannelId('channel:1:2')).toBeNull();
    expect(parseChannelId('')).toBeNull();
  });
});
