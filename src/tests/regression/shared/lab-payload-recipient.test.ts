import { describe, expect, test } from '@jest/globals';
import {
  parseLabPayloadRecipient,
  parseLabUserEmailFromPayloadValue,
  parseLabUserIdFromPayloadValue,
  resolvePayloadRecipient,
} from '@/shared/utils/lab-payload-path';

/**
 * Recipients come from event payloads, and payloads are written by whoever sends the event.
 *
 * Two identity kinds therefore have to be accepted on one path: a Task List event names an
 * `assigneeId`, while a connector row or a webhook body names an email. The interesting cases are
 * not "2 works" but "`2abc` must not silently mean user 2" and "an email must not be read as an id".
 */
describe('payload recipient parsing', () => {
  describe('parseLabUserIdFromPayloadValue', () => {
    test('accepts a positive integer', () => {
      expect(parseLabUserIdFromPayloadValue(2)).toBe(2);
    });

    test('accepts a numeric string', () => {
      expect(parseLabUserIdFromPayloadValue(' 7 ')).toBe(7);
    });

    test('rejects a numeric prefix, which parseInt would otherwise accept', () => {
      // The bug this catches: `parseInt('2abc', 10)` is `2`, so a malformed payload would notify
      // whoever happens to be user 2 — the most damaging possible silent success.
      expect(parseLabUserIdFromPayloadValue('2abc')).toBeNull();
    });

    test('rejects zero, negatives, non-numeric strings and empty values', () => {
      expect(parseLabUserIdFromPayloadValue(0)).toBeNull();
      expect(parseLabUserIdFromPayloadValue(-3)).toBeNull();
      expect(parseLabUserIdFromPayloadValue('')).toBeNull();
      expect(parseLabUserIdFromPayloadValue(null)).toBeNull();
      expect(parseLabUserIdFromPayloadValue(undefined)).toBeNull();
    });

    test('an email is not an id', () => {
      expect(parseLabUserIdFromPayloadValue('mia.chen@lab.local')).toBeNull();
    });
  });

  describe('parseLabUserEmailFromPayloadValue', () => {
    test('accepts an address and trims it', () => {
      expect(parseLabUserEmailFromPayloadValue('  mia.chen@lab.local ')).toBe(
        'mia.chen@lab.local',
      );
    });

    test('rejects a bare id, a blank string and anything with whitespace', () => {
      expect(parseLabUserEmailFromPayloadValue('2')).toBeNull();
      expect(parseLabUserEmailFromPayloadValue('   ')).toBeNull();
      expect(parseLabUserEmailFromPayloadValue('not an email@x')).toBeNull();
    });
  });

  describe('parseLabPayloadRecipient', () => {
    test('prefers a user id when the value could be either', () => {
      expect(parseLabPayloadRecipient('4')).toEqual({ userId: 4 });
    });

    test('falls back to an email', () => {
      expect(parseLabPayloadRecipient('sam.patel@lab.local')).toEqual({
        email: 'sam.patel@lab.local',
      });
    });

    test('returns null for an unusable value rather than guessing', () => {
      expect(parseLabPayloadRecipient('')).toBeNull();
      expect(parseLabPayloadRecipient({ nested: 'object' })).toBeNull();
    });
  });

  describe('resolvePayloadRecipient', () => {
    test('reads a dotted path', () => {
      expect(resolvePayloadRecipient({ user: { email: 'a@b.test' } }, 'user.email')).toEqual({
        email: 'a@b.test',
      });
    });

    test('an empty or missing path resolves to nothing, not to the whole payload', () => {
      expect(resolvePayloadRecipient({ userId: 3 }, '')).toBeNull();
      expect(resolvePayloadRecipient({ userId: 3 }, '   ')).toBeNull();
      expect(resolvePayloadRecipient({ userId: 3 }, 'absent')).toBeNull();
    });
  });
});
