import {
  billiardsOpponentTurnsHiddenForFeed,
  countBilliardsTurnsHiddenDuringPresentation,
  countHiddenOpponentTailPlayerTurns,
  countOpponentTurnsHiddenSinceBaseline,
  playerTurnFeedRowsToHideDuringDefer,
  isBilliardsPendingOpponentCuePlacePresentation,
  isBilliardsPendingOpponentPresentation,
  shouldDeferBilliardsPlayerTurnFeed,
  slicePlayerTurnsForPresentation,
} from '@/apps/billiards/shared/billiards-player-turn-feed-defer';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';

function state(historyLen: number): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: Array.from({ length: historyLen }, (_, i) => ({
      seat: 2,
      summary: `Shot ${i + 1}`,
    })),
    shotsTaken: historyLen,
    seatGroups: { 1: 'solids', 2: 'stripes' },
    resultMessage: null,
    winnerSeat: null,
  };
}

describe('billiards player turn feed defer', () => {
  test('defers while opponent presentation phases active', () => {
    expect(
      shouldDeferBilliardsPlayerTurnFeed({
        practiceMode: false,
        opponentShotPhase: 'rolling',
        opponentPlacePhase: 'idle',
      }),
    ).toBe(true);
    expect(
      shouldDeferBilliardsPlayerTurnFeed({
        practiceMode: false,
        opponentShotPhase: 'idle',
        opponentPlacePhase: 'animating',
      }),
    ).toBe(true);
    expect(
      shouldDeferBilliardsPlayerTurnFeed({
        practiceMode: false,
        opponentShotPhase: 'idle',
        opponentPlacePhase: 'idle',
      }),
    ).toBe(false);
    expect(
      shouldDeferBilliardsPlayerTurnFeed({
        practiceMode: false,
        opponentShotPhase: 'queued',
        opponentPlacePhase: 'idle',
      }),
    ).toBe(true);
    expect(
      shouldDeferBilliardsPlayerTurnFeed({
        practiceMode: false,
        opponentShotPhase: 'idle',
        opponentPlacePhase: 'idle',
        presentationExecutorBusy: true,
      }),
    ).toBe(true);
    expect(
      shouldDeferBilliardsPlayerTurnFeed({
        practiceMode: false,
        opponentShotPhase: 'idle',
        opponentPlacePhase: 'idle',
        pendingOpponentShotReplay: true,
      }),
    ).toBe(true);
  });

  test('hides tail turns by baseline history length', () => {
    expect(countBilliardsTurnsHiddenDuringPresentation(state(3), state(2))).toBe(1);
    expect(countBilliardsTurnsHiddenDuringPresentation(state(2), state(2))).toBe(0);
  });

  test('pending presentation includes unconsumed opponent cue place', () => {
    const match = state(1);
    expect(
      isBilliardsPendingOpponentPresentation({
        practiceMode: false,
        yourSeat: 1,
        state: {
          ...match,
          lastCuePlaceReplay: {
            seat: 2,
            historyIndex: 1,
            x: 200,
            y: 200,
            placementZone: 'table',
            prePlaceBalls: [],
          },
        },
        lastConsumedShotReplay: 0,
        lastConsumedCuePlaceIndex: 0,
        opponentPlacePhase: 'idle',
      }),
    ).toBe(true);
  });

  test('defers UI while unconsumed opponent cue place is pending', () => {
    const match = state(1);
    expect(
      isBilliardsPendingOpponentCuePlacePresentation({
        practiceMode: false,
        yourSeat: 1,
        state: {
          ...match,
          lastCuePlaceReplay: {
            seat: 2,
            historyIndex: 1,
            x: 200,
            y: 200,
            placementZone: 'table',
            prePlaceBalls: [],
          },
        },
        lastConsumedCuePlaceIndex: 0,
        opponentPlacePhase: 'idle',
      }),
    ).toBe(true);
  });

  test('falls back to hiding one opponent row when baseline is missing', () => {
    const authoritative = state(2);
    expect(billiardsOpponentTurnsHiddenForFeed(authoritative, null, 1)).toBe(1);
    expect(billiardsOpponentTurnsHiddenForFeed(authoritative, null, 2)).toBe(0);
  });

  test('opponent-only baseline delta does not count human history rows', () => {
    const authoritative: BilliardsMatchState = {
      ...state(3),
      turnHistory: [
        { seat: 1, summary: 'Shot — pocketed 1 (50% power)' },
        { seat: 1, summary: 'Shot — pocketed 3 (60% power)' },
        { seat: 2, summary: 'Shot (40% power)' },
      ],
    };
    const baseline = state(0);
    expect(countBilliardsTurnsHiddenDuringPresentation(authoritative, baseline)).toBe(3);
    expect(countOpponentTurnsHiddenSinceBaseline(authoritative, baseline, 1)).toBe(1);
  });

  test('feed defer hides at most one trailing opponent player-turn row', () => {
    const turns = [
      { seat: 1 },
      { seat: 1 },
      { seat: 2 },
    ];
    expect(countHiddenOpponentTailPlayerTurns(turns, 1)).toBe(1);
    expect(
      playerTurnFeedRowsToHideDuringDefer(turns, 1, { pendingOpponentPresentation: true }),
    ).toBe(1);
    expect(
      playerTurnFeedRowsToHideDuringDefer(turns, 1, { pendingOpponentPresentation: false }),
    ).toBe(0);
    expect(
      playerTurnFeedRowsToHideDuringDefer(
        [{ seat: 1 }, { seat: 1 }],
        1,
        { pendingOpponentPresentation: true },
      ),
    ).toBe(0);
  });

  test('slicePlayerTurnsForPresentation drops newest rows', () => {
    const turns = [{ id: '1' }, { id: '2' }, { id: '3' }];
    expect(slicePlayerTurnsForPresentation(turns, 1).map((t) => t.id)).toEqual(['1', '2']);
  });
});
