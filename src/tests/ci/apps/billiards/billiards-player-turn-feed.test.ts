import { isBilliardsPlayerTurnFeedWorthy } from '@/apps/billiards/shared/billiards-player-turn-feed';

describe('isBilliardsPlayerTurnFeedWorthy', () => {
  test('includes pockets and group claim', () => {
    expect(
      isBilliardsPlayerTurnFeedWorthy('Shot — stripes for Alex — pocketed 9, 11 (77% power)'),
    ).toBe(true);
  });

  test('excludes dry miss', () => {
    expect(isBilliardsPlayerTurnFeedWorthy('Shot (41% power)')).toBe(false);
  });

  test('includes scratch fouls', () => {
    expect(
      isBilliardsPlayerTurnFeedWorthy('Cue ball scratch — ball in hand (88% power)'),
    ).toBe(true);
  });

  test('excludes cue placement', () => {
    expect(isBilliardsPlayerTurnFeedWorthy('Cue ball placed')).toBe(false);
  });
});
