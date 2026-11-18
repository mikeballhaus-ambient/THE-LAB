import { shouldApplyMatchViewRevision } from '@/shared/game-platform/match-view-ordering';
import type { MatchView } from '@/shared/game-platform/types';

function view(rev: number, state: Record<string, unknown> = { turn: rev }): MatchView {
  return {
    matchId: 'm1',
    gameId: 'billiards',
    status: 'active',
    opponentKind: 'ai',
    difficulty: 'medium',
    yourSeat: 1,
    currentSeat: 1,
    state,
    scores: {},
    turnRemainingMs: 60_000,
    winnerUserId: null,
    player1Id: 1,
    player2Id: 2,
    stateRevision: rev,
  };
}

describe('match-view-ordering', () => {
  test('drops strictly older revision', () => {
    expect(shouldApplyMatchViewRevision(view(2), view(1))).toBe('drop');
  });

  test('applies strictly newer revision', () => {
    expect(shouldApplyMatchViewRevision(view(1), view(2))).toBe('apply');
  });

  test('equal revision with identical state is noop', () => {
    expect(shouldApplyMatchViewRevision(view(3, { a: 1 }), view(3, { a: 1 }))).toBe('noop');
  });

  test('equal revision with different state still applies', () => {
    expect(shouldApplyMatchViewRevision(view(3, { a: 1 }), view(3, { a: 2 }))).toBe('apply');
  });

  test('applies when switching to a new match id', () => {
    const prev = view(5);
  const next = { ...view(1), matchId: 'm2' };
    expect(shouldApplyMatchViewRevision(prev, next)).toBe('apply');
  });
});
