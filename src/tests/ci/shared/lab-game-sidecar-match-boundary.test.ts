import {
  labGameSidecarMatchChanged,
  shouldResetLabGameSidecarThread,
} from '@/shared/composables/lab-sidecar/lab-game-sidecar-match-boundary';

describe('lab game sidecar match boundary', () => {
  test('detects new match on reused game tab', () => {
    expect(labGameSidecarMatchChanged('match-a', 'match-b')).toBe(true);
  });

  test('no change when match id is unchanged', () => {
    expect(labGameSidecarMatchChanged('match-a', 'match-a')).toBe(false);
  });

  test('first engagement has no prior match', () => {
    expect(labGameSidecarMatchChanged(undefined, 'match-b')).toBe(false);
  });

  test('reset legacy game tab with stale banter but no lastMatchId', () => {
    expect(
      shouldResetLabGameSidecarThread({
        previousMatchId: undefined,
        nextMatchId: 'match-new',
        messageCount: 3,
        hasGameSidecarBinding: true,
      }),
    ).toBe(true);
  });

  test('no reset on empty new game tab', () => {
    expect(
      shouldResetLabGameSidecarThread({
        previousMatchId: undefined,
        nextMatchId: 'match-new',
        messageCount: 0,
        hasGameSidecarBinding: false,
      }),
    ).toBe(false);
  });
});
