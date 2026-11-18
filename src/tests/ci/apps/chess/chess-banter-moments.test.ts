import type { MatchView } from '@/shared/game-platform/types';
import { detectChessBanterMoment } from '@/apps/chess/shared/chess-banter-moments';
import { createInitialPieces } from '@/apps/chess/shared/chess-rules';

function baseMatch(overrides: Partial<MatchView>): MatchView {
  return {
    matchId: 'm1',
    gameId: 'chess',
    status: 'active',
    opponentKind: 'ai',
    difficulty: 'medium',
    yourSeat: 1,
    currentSeat: 2,
    state: { pieces: createInitialPieces(), turnHistory: [] },
    scores: { 1: 0, 2: 0 },
    turnRemainingMs: 60_000,
    winnerUserId: null,
    player1Id: 10,
    player2Id: 20,
    ...overrides,
  };
}

describe('detectChessBanterMoment', () => {
  test('returns null for non-ai matches', () => {
    const next = baseMatch({ opponentKind: 'human' });
    expect(detectChessBanterMoment(null, next)).toBeNull();
  });

  test('detects match end when human wins', () => {
    const prev = baseMatch({ status: 'active' });
    const next = baseMatch({
      status: 'finished',
      winnerUserId: 10,
      currentSeat: 1,
    });
    expect(detectChessBanterMoment(prev, next)).toEqual({
      kind: 'match_loss',
      moverSeat: 1,
    });
  });

  test('detects match draw on finish without winner', () => {
    const prev = baseMatch({ status: 'active' });
    const next = baseMatch({ status: 'finished', winnerUserId: null });
    expect(detectChessBanterMoment(prev, next)).toEqual({ kind: 'match_draw' });
  });

  test('does not re-emit when already finished', () => {
    const prev = baseMatch({ status: 'finished', winnerUserId: 10 });
    const next = baseMatch({ status: 'finished', winnerUserId: 10 });
    expect(detectChessBanterMoment(prev, next)).toBeNull();
  });

  test('detects capture when victim piece count drops', () => {
    const pieces = createInitialPieces();
    const prev = baseMatch({
      state: {
        pieces,
        turnHistory: [{ seat: 1, summary: 'e2-e4' }],
      },
    });
    const withoutPawn = pieces.filter((p) => !(p.type === 'pawn' && p.color === 'black' && p.row === 6 && p.col === 4));
    const next = baseMatch({
      currentSeat: 1,
      state: {
        pieces: withoutPawn,
        turnHistory: [
          { seat: 1, summary: 'e2-e4' },
          { seat: 2, summary: 'exd4' },
        ],
      },
    });
    expect(detectChessBanterMoment(prev, next)).toMatchObject({ kind: 'capture', moverSeat: 2 });
  });
});
