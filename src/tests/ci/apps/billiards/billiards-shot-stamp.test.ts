import { stampShotWithAuthoritativeCue } from '@/apps/billiards/shared/billiards-shot-stamp';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

function aimState(cue: { x: number; y: number }): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: cue.x, y: cue.y, pocketed: false },
      { id: 'ball-1', number: 1, x: 600, y: 250, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 2,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
  };
}

describe('stampShotWithAuthoritativeCue', () => {
  test('stamps cue center on payload and state', () => {
    const state = aimState({ x: 142.5, y: 188 });
    const { state: stampedState, shot } = stampShotWithAuthoritativeCue(state, {
      angleRad: 0.2,
      power: 0.8,
      englishX: 0,
      englishY: 0,
      cueBallX: 99,
      cueBallY: 88,
    });
    expect(shot.cueBallX).toBe(142.5);
    expect(shot.cueBallY).toBe(188);
    const cue = stampedState.balls.find((b) => b.number === 0)!;
    expect(cue.x).toBe(142.5);
    expect(cue.y).toBe(188);
  });
});
