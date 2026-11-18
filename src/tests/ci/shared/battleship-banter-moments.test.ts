import { describe, expect, test } from '@jest/globals';
import type { MatchView } from '@/shared/game-platform/types';
import { detectBattleshipBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors/battleship';

function view(
  shotsAt: Record<number, Record<string, 'hit' | 'miss'>>,
  status: MatchView['status'] = 'active',
): MatchView {
  return {
    gameId: 'battleship',
    matchId: 'm',
    status,
    opponentKind: 'ai',
    difficulty: 'easy',
    yourSeat: 1,
    currentSeat: 1,
    scores: { 1: 5, 2: 5 },
    turnRemainingMs: 30_000,
    winnerUserId: null,
    player1Id: 1,
    player2Id: 2,
    state: { shotsAt, fleets: { 1: [], 2: [] } },
  };
}

describe('detectBattleshipBanterMoment', () => {
  test('detects new hit and attributes mover seat', () => {
    const prev = view({ 1: { '1,1': 'miss' }, 2: {} });
    const next = view({ 1: { '1,1': 'miss', '3,3': 'hit' }, 2: {} });
    const moment = detectBattleshipBanterMoment(prev, next);
    expect(moment?.kind).toBe('hit');
    expect(moment?.moverSeat).toBe(1);
    expect(moment?.detail).toContain('no coordinates in Sidecar speech');
  });

  test('ignores when hit count unchanged', () => {
    const prev = view({ 1: { '2,2': 'hit' }, 2: {} });
    const next = view({ 1: { '2,2': 'hit', '2,3': 'miss' }, 2: {} });
    expect(detectBattleshipBanterMoment(prev, next)).toBeNull();
  });
});
