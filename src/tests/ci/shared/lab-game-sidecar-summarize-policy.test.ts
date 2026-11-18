import { describe, expect, test } from '@jest/globals';
import { shouldSummarizeLabGameSidecarOnNewMatch } from '@/shared/composables/lab-sidecar/lab-game-sidecar-summarize-policy';

describe('lab-game-sidecar-summarize-policy', () => {
  test('skips first match and same match id', () => {
    expect(
      shouldSummarizeLabGameSidecarOnNewMatch({
        previousMatchId: undefined,
        nextMatchId: 'm2',
        contextUsedPercent: 80,
        messageCount: 30,
      }),
    ).toBe(false);
    expect(
      shouldSummarizeLabGameSidecarOnNewMatch({
        previousMatchId: 'm1',
        nextMatchId: 'm1',
        contextUsedPercent: 80,
        messageCount: 30,
      }),
    ).toBe(false);
  });

  test('summarizes on new match when context is high enough', () => {
    expect(
      shouldSummarizeLabGameSidecarOnNewMatch({
        previousMatchId: 'm1',
        nextMatchId: 'm2',
        contextUsedPercent: 50,
        messageCount: 12,
      }),
    ).toBe(true);
  });

  test('summarizes on new match when message count is high', () => {
    expect(
      shouldSummarizeLabGameSidecarOnNewMatch({
        previousMatchId: 'm1',
        nextMatchId: 'm2',
        contextUsedPercent: 10,
        messageCount: 30,
      }),
    ).toBe(true);
  });
});
