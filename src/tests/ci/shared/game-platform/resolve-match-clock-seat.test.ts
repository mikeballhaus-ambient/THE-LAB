import { resolveMatchClockSeat } from '@/shared/game-platform/resolve-match-clock-seat';
import type { GameServerAdapter } from '@/shared/game-platform/types';

describe('resolveMatchClockSeat', () => {
  const togglingAdapter: GameServerAdapter = {
    gameId: 'test',
    createInitialState: () => ({}),
    validateMove: () => ({ ok: true }),
    applyMove: (s) => s,
    scores: () => ({}),
    isFinished: () => false,
    winnerSeat: () => null,
    onTurnTimeout: (s) => s,
    nextSeatAfterMove: () => 1,
  };

  test('prefers continueTurnSeat on aim when adapter toggles wrong', () => {
    const state = {
      phase: 'aim',
      ballInHand: false,
      continueTurnSeat: 2,
    };
    expect(resolveMatchClockSeat(state, togglingAdapter, { type: 'shot' }, 2)).toBe(2);
  });

  test('coerces string continueTurnSeat', () => {
    const state = {
      phase: 'aim',
      ballInHand: false,
      continueTurnSeat: '2',
    };
    expect(resolveMatchClockSeat(state, togglingAdapter, { type: 'shot' }, 2)).toBe(2);
  });

  test('aim phase prefers continueTurnSeat over stale ballInHand flag', () => {
    const state = {
      phase: 'aim',
      ballInHand: true,
      ballInHandSeat: 1,
      continueTurnSeat: 2,
    };
    expect(resolveMatchClockSeat(state, togglingAdapter, { type: 'shot' }, 2)).toBe(2);
  });
});
