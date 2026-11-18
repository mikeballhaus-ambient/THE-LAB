import { describe, expect, test } from '@jest/globals';
import type { MatchView } from '@/shared/game-platform/types';
import { detectPokerHoldemBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors/poker-holdem';

function baseMatch(partial: Partial<MatchView> & Pick<MatchView, 'state'>): MatchView {
  return {
    matchId: 'm1',
    gameId: 'poker-holdem',
    status: 'active',
    yourSeat: 1,
    currentSeat: 2,
    opponentKind: 'ai',
    stateRevision: 1,
    turnRemainingMs: 60_000,
    scores: { 1: 0, 2: 0 },
    ...partial,
  } as MatchView;
}

describe('detectPokerHoldemBanterMoment', () => {
  test('does not fire on pot growth alone (human call before agent acts)', () => {
    const prev = baseMatch({
      state: { pot: 75, turnHistory: [{ seat: 1, summary: 'Posted small blind' }] },
    });
    const next = baseMatch({
      state: {
        pot: 100,
        turnHistory: [
          { seat: 1, summary: 'Posted small blind' },
          { seat: 1, summary: 'Called 25 Quarks' },
        ],
      },
    });
    expect(detectPokerHoldemBanterMoment(prev, next)).toBeNull();
  });

  test('fires when opponent fold is recorded in history', () => {
    const prev = baseMatch({
      state: {
        pot: 100,
        turnHistory: [{ seat: 1, summary: 'Called 25 Quarks' }],
      },
    });
    const next = baseMatch({
      state: {
        pot: 100,
        turnHistory: [
          { seat: 1, summary: 'Called 25 Quarks' },
          { seat: 2, summary: 'Folded' },
        ],
      },
    });
    const moment = detectPokerHoldemBanterMoment(prev, next);
    expect(moment?.kind).toBe('highlight');
    expect(moment?.moverSeat).toBe(2);
  });
});
