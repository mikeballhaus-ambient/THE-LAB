import type { MatchView } from '@/shared/game-platform/types';
import { detectMatchEndBanterMoment } from '@/shared/game-platform/lab-assistant-banter/match-end-moment';
import {
  detectBattleshipBanterMoment,
  detectCheckersBanterMoment,
} from '@/shared/game-platform/lab-assistant-banter/detectors';

function baseMatch(overrides: Partial<MatchView>): MatchView {
  return {
    matchId: 'm1',
    gameId: 'test',
    status: 'active',
    opponentKind: 'ai',
    difficulty: 'medium',
    yourSeat: 1,
    currentSeat: 2,
    state: {},
    scores: { 1: 0, 2: 0 },
    turnRemainingMs: 60_000,
    winnerUserId: null,
    player1Id: 10,
    player2Id: 20,
    ...overrides,
  };
}

describe('lab-assistant banter detectors', () => {
  test('detectMatchEndBanterMoment — assistant win', () => {
    const prev = baseMatch({ status: 'active' });
    const next = baseMatch({ status: 'finished', winnerUserId: 20 });
    expect(detectMatchEndBanterMoment(prev, next)).toEqual({
      kind: 'match_win',
      moverSeat: 2,
    });
  });

  test('detectCheckersBanterMoment — capture from history', () => {
    const prev = baseMatch({
      state: {
        pieces: [{ id: 1 }, { id: 2 }],
        turnHistory: [{ seat: 1, summary: 'Moved' }],
      },
    });
    const next = baseMatch({
      currentSeat: 1,
      state: {
        pieces: [{ id: 1 }],
        turnHistory: [{ seat: 1, summary: 'Moved' }, { seat: 2, summary: 'Captured piece 2' }],
      },
    });
    expect(detectCheckersBanterMoment(prev, next)).toMatchObject({ kind: 'capture', moverSeat: 2 });
  });

  test('detectBattleshipBanterMoment — hit on new shot', () => {
    const prev = baseMatch({
      currentSeat: 1,
      state: {
        shotsAt: { 2: { '0,0': 'miss' } },
      },
    });
    const next = baseMatch({
      currentSeat: 1,
      state: {
        shotsAt: { 2: { '0,0': 'miss', '1,1': 'hit' } },
      },
    });
    expect(detectBattleshipBanterMoment(prev, next)).toMatchObject({ kind: 'hit', moverSeat: 2 });
  });
});
