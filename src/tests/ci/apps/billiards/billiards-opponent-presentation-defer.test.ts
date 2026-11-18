import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import {
  billiardsOpponentPresentationKey,
  billiardsShouldDeferBanterForPresentation,
  shouldDeferBilliardsResultModal,
} from '@/apps/billiards/shared/billiards-opponent-presentation-defer';

function minimalState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    balls: [],
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    ballInHand: false,
    ballInHandSeat: null,
    seatGroups: { 1: null, 2: null },
    shotsTaken: 3,
    turnHistory: [{ seat: 2, summary: 'shot' }],
    ...overrides,
  } as BilliardsMatchState;
}

describe('billiards-opponent-presentation-defer', () => {
  test('defers banter when opponent shot replay is pending and not yet presented', () => {
    const state = minimalState({
      lastShotReplay: {
        seat: 2,
        shotsTaken: 3,
        angleRad: 0,
        power: 0.5,
        englishX: 0,
        englishY: 0,
        preShotBalls: [{ id: 'cue', number: 0, x: 0, y: 0, pocketed: false }],
        shotVarianceResolved: true,
      },
    });
    expect(billiardsOpponentPresentationKey(state, 1)).toBe('shot:3');
    expect(billiardsShouldDeferBanterForPresentation(state, 1, new Set())).toBe(true);
    expect(billiardsShouldDeferBanterForPresentation(state, 1, new Set(['shot:3']))).toBe(false);
  });

  test('defers for Lab Assistant break (opening shot, seat 2)', () => {
    const state = minimalState({
      shotsTaken: 1,
      continueTurnSeat: 1,
      lastShotReplay: {
        seat: 2,
        shotsTaken: 1,
        angleRad: -0.4,
        power: 0.9,
        englishX: 0,
        englishY: 0,
        preShotBalls: [{ id: 'cue', number: 0, x: 0, y: 0, pocketed: false }],
        shotVarianceResolved: true,
      },
    });
    expect(billiardsOpponentPresentationKey(state, 1)).toBe('shot:1');
    expect(billiardsShouldDeferBanterForPresentation(state, 1, new Set())).toBe(true);
  });

  test('defers result modal on frame-ending opponent 8 until replay is consumed', () => {
    const state = minimalState({
      phase: 'finished',
      winnerSeat: 1,
      shotsTaken: 12,
      lastShotReplay: {
        seat: 2,
        shotsTaken: 12,
        angleRad: 0.2,
        power: 0.7,
        englishX: 0,
        englishY: 0,
        preShotBalls: [{ id: 'cue', number: 0, x: 0, y: 0, pocketed: false }],
        shotVarianceResolved: true,
      },
    });
    const base = {
      practiceMode: false,
      yourSeat: 1,
      state,
      lastConsumedShotReplay: 11,
      lastConsumedCuePlaceIndex: 0,
      presentedKeys: new Set<string>(),
      opponentShotPhase: 'idle' as const,
      opponentPlacePhase: 'idle' as const,
      presentationExecutorBusy: false,
      shotInteractionBusy: false,
      opponentPresentationBusy: false,
    };
    expect(shouldDeferBilliardsResultModal(base)).toBe(true);
    expect(
      shouldDeferBilliardsResultModal({
        ...base,
        lastConsumedShotReplay: 12,
        presentedKeys: new Set(['shot:12']),
      }),
    ).toBe(false);
  });

  test('does not defer for own-seat replay metadata', () => {
    const state = minimalState({
      lastShotReplay: {
        seat: 1,
        shotsTaken: 3,
        angleRad: 0,
        power: 0.5,
        englishX: 0,
        englishY: 0,
        preShotBalls: [{ id: 'cue', number: 0, x: 0, y: 0, pocketed: false }],
        shotVarianceResolved: true,
      },
    });
    expect(billiardsOpponentPresentationKey(state, 1)).toBeNull();
    expect(billiardsShouldDeferBanterForPresentation(state, 1, new Set())).toBe(false);
  });
});
