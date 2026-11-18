import { describe, expect, test } from '@jest/globals';
import { resolveLabGameHintDevMockEnabled } from '@/shared/game-platform/lab-game-hint-dev-mock';

describe('resolveLabGameHintDevMockEnabled', () => {
  test('enabled in Vite dev when prod flag unset', () => {
    expect(
      resolveLabGameHintDevMockEnabled({ isDev: true, isProd: false, envFlag: undefined }),
    ).toBe(true);
  });

  test('disabled in production unless env flag is 1', () => {
    expect(
      resolveLabGameHintDevMockEnabled({ isDev: false, isProd: true, envFlag: undefined }),
    ).toBe(false);
    expect(
      resolveLabGameHintDevMockEnabled({ isDev: false, isProd: true, envFlag: '1' }),
    ).toBe(true);
  });

  test('env flag 0 forces off', () => {
    expect(
      resolveLabGameHintDevMockEnabled({ isDev: true, isProd: false, envFlag: '0' }),
    ).toBe(false);
  });
});
