import {
  isBilliardsPendingOpponentShotReplay,
  shouldBilliardsReplayOpponentShot,
} from '@/apps/billiards/shared/billiards-opponent-replay-sync';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

function baseState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 1,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
    lastShotReplay: {
      seat: 2,
      angleRad: 0,
      power: 0.5,
      englishX: 0,
      englishY: 0,
      shotsTaken: 1,
      preShotBalls: [{ id: 'cue', number: 0, x: 100, y: 100, pocketed: false }],
      shotVarianceResolved: true,
    },
    ...overrides,
  };
}

describe('billiards opponent replay sync', () => {
  test('pending when server sent opponent replay not yet consumed', () => {
    expect(
      isBilliardsPendingOpponentShotReplay({
        practiceMode: false,
        yourSeat: 1,
        state: baseState(),
        lastConsumedReplayShots: -1,
        opponentReplayBusy: false,
        isRolling: false,
      }),
    ).toBe(true);
  });

  test('not pending after consumed or during roll', () => {
    expect(
      isBilliardsPendingOpponentShotReplay({
        practiceMode: false,
        yourSeat: 1,
        state: baseState(),
        lastConsumedReplayShots: 1,
        opponentReplayBusy: false,
        isRolling: false,
      }),
    ).toBe(false);
    expect(
      isBilliardsPendingOpponentShotReplay({
        practiceMode: false,
        yourSeat: 1,
        state: baseState(),
        lastConsumedReplayShots: -1,
        opponentReplayBusy: false,
        isRolling: true,
      }),
    ).toBe(false);
  });

  test('should replay requires pre-shot snapshot', () => {
    const preShot = baseState({ shotsTaken: 0, lastShotReplay: null });
    const post = baseState();
    expect(
      shouldBilliardsReplayOpponentShot({
        practiceMode: false,
        yourSeat: 1,
        state: post,
        preShot,
        lastConsumedReplayShots: -1,
        opponentReplayBusy: false,
        opponentPlacementBusy: false,
        isRolling: false,
      }),
    ).toBe(true);
    expect(
      shouldBilliardsReplayOpponentShot({
        practiceMode: false,
        yourSeat: 1,
        state: post,
        preShot: null,
        lastConsumedReplayShots: -1,
        opponentReplayBusy: false,
        opponentPlacementBusy: false,
        isRolling: false,
      }),
    ).toBe(false);
  });
});
