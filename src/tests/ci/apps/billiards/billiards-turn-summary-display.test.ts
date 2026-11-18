import type { MatchView } from '@/shared/game-platform/types';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import {
  createBilliardsSeatNameResolver,
  humanizeBilliardsTurnSummary,
} from '@/apps/billiards/shared/billiards-turn-summary-display';

function matchView(overrides: Partial<MatchView> = {}): MatchView {
  return {
    matchId: 'm1',
    gameId: 'app-billiards-eight-ball',
    status: 'active',
    opponentKind: 'ai',
    difficulty: 'medium',
    yourSeat: 1,
    currentSeat: 1,
    state: {},
    scores: {},
    turnRemainingMs: 60_000,
    winnerUserId: null,
    player1Id: 10,
    player2Id: 0,
    ...overrides,
  };
}

describe('humanizeBilliardsTurnSummary', () => {
  test('replaces group claim seat with Lab Assistant on ai matches', () => {
    const m = matchView({ opponentKind: 'ai', yourSeat: 1 });
    const resolver = createBilliardsSeatNameResolver({
      rosterNameForUserId: () => null,
      humanDisplayName: 'Alex',
    });
    const raw = 'Shot — stripes for seat 2 — pocketed 11 (100% power)';
    expect(humanizeBilliardsTurnSummary(raw, resolver, m)).toBe(
      `Shot — stripes for ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} — pocketed 11 (100% power)`,
    );
  });

  test('foul summaries name who receives ball in hand (opponent scratched)', () => {
    const m = matchView({ opponentKind: 'ai', yourSeat: 1 });
    const resolver = createBilliardsSeatNameResolver({
      rosterNameForUserId: () => null,
      humanDisplayName: 'Alex',
    });
    const raw = 'Scratch — ball in hand (80% power)';
    expect(humanizeBilliardsTurnSummary(raw, resolver, m, 2)).toBe(
      'Scratch — you have ball in hand (80% power)',
    );
  });

  test('foul summaries name opponent when you fouled', () => {
    const m = matchView({ opponentKind: 'ai', yourSeat: 1 });
    const resolver = createBilliardsSeatNameResolver({
      rosterNameForUserId: () => null,
      humanDisplayName: 'Alex',
    });
    const raw = 'Wrong ball first — turn passes to opponent (42% power)';
    expect(humanizeBilliardsTurnSummary(raw, resolver, m, 1)).toBe(
      `Wrong ball first — turn passes to opponent (42% power)`,
    );
  });

  test('uses human display name for your seat on group claim', () => {
    const m = matchView({ opponentKind: 'human', yourSeat: 1, player1Id: 10, player2Id: 20 });
    const resolver = createBilliardsSeatNameResolver({
      rosterNameForUserId: (id) => (id === 20 ? 'Jordan' : null),
      humanDisplayName: 'Alex',
    });
    const raw = 'Shot — solids for seat 1 — pocketed 3 (55% power)';
    expect(humanizeBilliardsTurnSummary(raw, resolver, m)).toBe(
      'Shot — solids for Alex — pocketed 3 (55% power)',
    );
  });
});
