import {
  createInitialBilliardsPresentation,
  planBilliardsOpponentShotReplay,
  reduceBilliardsPresentation,
  type BilliardsPresentationModel,
} from '@/apps/billiards/front-end/stores/billiardsPresentation';
import { computeSkippedOpponentShots } from '@/apps/billiards/shared/billiards-presentation-jobs';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '@/apps/billiards/shared/billiards-types';

function rackedState(): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: 100, y: 200, pocketed: false },
      { id: '1', number: 1, x: 500, y: 250, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 0,
    seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
    resultMessage: null,
    winnerSeat: null,
  };
}

function postBreakState(): BilliardsMatchState {
  return {
    ...rackedState(),
    shotsTaken: 1,
    physicsVarianceSeed: 12345,
    balls: [
      { id: 'cue', number: 0, x: 140, y: 210, pocketed: false },
      { id: '1', number: 1, x: 520, y: 280, pocketed: false },
    ],
    lastShotReplay: {
      seat: 2,
      angleRad: 0.2,
      power: 0.55,
      englishX: 0,
      englishY: 0,
      shotsTaken: 1,
      preShotBalls: [
        { id: 'cue', number: 0, x: 140, y: 210, pocketed: false },
        { id: '1', number: 1, x: 520, y: 280, pocketed: false },
      ],
      shotVarianceResolved: true,
    },
    turnHistory: [{ seat: 2, summary: 'Shot (55% power)' }],
  };
}

describe('billiards presentation reducer', () => {
  test('AUTHORITATIVE_ARRIVED queues opponent break replay', () => {
    let model: BilliardsPresentationModel = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      baseline: rackedState(),
    };
    model = reduceBilliardsPresentation(model, {
      type: 'AUTHORITATIVE_ARRIVED',
      state: postBreakState(),
    });
    expect(model.opponentShotPhase).toBe('queued');
    expect(model.authoritative?.shotsTaken).toBe(1);
  });

  test('AUTHORITATIVE_ARRIVED queues without baseline when server sends preShotBalls', () => {
    let model: BilliardsPresentationModel = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      baseline: null,
    };
    model = reduceBilliardsPresentation(model, {
      type: 'AUTHORITATIVE_ARRIVED',
      state: postBreakState(),
    });
    expect(model.baseline).toBeNull();
    expect(model.opponentShotPhase).toBe('queued');
  });

  test('shot replay lifecycle consumes on finish', () => {
    let model = createInitialBilliardsPresentation();
    model = reduceBilliardsPresentation(model, {
      type: 'OPPONENT_SHOT_REPLAY_STARTED',
      shotsTaken: 1,
    });
    expect(model.opponentShotPhase).toBe('aim_pull');
    expect(model.inFlightShotReplay).toBe(1);
    expect(model.lastConsumedShotReplay).toBe(-1);
    model = reduceBilliardsPresentation(model, { type: 'OPPONENT_SHOT_ROLL_STARTED' });
    expect(model.opponentShotPhase).toBe('rolling');
    model = reduceBilliardsPresentation(model, {
      type: 'OPPONENT_SHOT_REPLAY_FINISHED',
      shotsTaken: 1,
    });
    expect(model.opponentShotPhase).toBe('idle');
    expect(model.lastConsumedShotReplay).toBe(1);
    expect(model.inFlightShotReplay).toBeNull();
  });

  test('planOpponentShotReplay uses baseline as pre-shot', () => {
    const model = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      baseline: rackedState(),
    };
    const plan = planBilliardsOpponentShotReplay(model, postBreakState(), false);
    expect(plan.run).toBe(true);
    expect(plan.preShot?.shotsTaken).toBe(0);
    expect(plan.replay?.shotsTaken).toBe(1);
  });

  test('AUTHORITATIVE_ARRIVED clears stale queued after replay consumed', () => {
    let model: BilliardsPresentationModel = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      opponentShotPhase: 'queued',
      lastConsumedShotReplay: 1,
      authoritative: postBreakState(),
      baseline: rackedState(),
    };
    model = reduceBilliardsPresentation(model, {
      type: 'AUTHORITATIVE_ARRIVED',
      state: postBreakState(),
    });
    expect(model.opponentShotPhase).toBe('idle');
  });

  test('BASELINE_COMMITTED keeps queued while opponent replay is still pending', () => {
    let model: BilliardsPresentationModel = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      opponentShotPhase: 'queued',
      lastConsumedShotReplay: -1,
      authoritative: postBreakState(),
      baseline: rackedState(),
    };
    model = reduceBilliardsPresentation(model, {
      type: 'BASELINE_COMMITTED',
      state: postBreakState(),
    });
    expect(model.opponentShotPhase).toBe('queued');
    expect(model.baseline?.shotsTaken).toBe(1);
  });

  test('planOpponentShotReplay uses server preShotBalls when baseline missing', () => {
    const model = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      baseline: null,
    };
    const plan = planBilliardsOpponentShotReplay(model, postBreakState(), false);
    expect(plan.run).toBe(true);
    expect(plan.preShot?.balls).toEqual(postBreakState().lastShotReplay?.preShotBalls);
  });

  test('INGEST_DEFERRED records summarized strokes when superseding pending authority', () => {
    const pending = postBreakState();
    const later: BilliardsMatchState = {
      ...pending,
      shotsTaken: 3,
      lastShotReplay: {
        ...(pending.lastShotReplay!),
        shotsTaken: 3,
      },
      turnHistory: [
        ...pending.turnHistory,
        { seat: 2, summary: 'Shot' },
        { seat: 2, summary: 'Shot' },
      ],
    };
    let model: BilliardsPresentationModel = {
      ...createInitialBilliardsPresentation(),
      yourSeat: 1,
      practiceMode: false,
      lastConsumedShotReplay: 0,
      pendingAuthoritative: pending,
      presentationExecutorBusy: true,
    };
    model = reduceBilliardsPresentation(model, { type: 'INGEST_DEFERRED', state: later });
    expect(model.pendingAuthoritative?.shotsTaken).toBe(3);
    expect(model.skippedFeedSummaries.length).toBeGreaterThan(0);
    expect(model.presentedKeys).toContain('shot:1');
  });

  test('matchId change resets presentation via RESET event', () => {
    let model: BilliardsPresentationModel = {
      ...createInitialBilliardsPresentation(),
      matchId: 'match-a',
      yourSeat: 1,
      lastConsumedShotReplay: 5,
      skippedFeedSummaries: ['Opponent — 2 strokes (summarized)'],
    };
    model = reduceBilliardsPresentation(model, {
      type: 'RESET',
      matchId: 'match-b',
      yourSeat: 1,
      practiceMode: false,
    });
    expect(model.matchId).toBe('match-b');
    expect(model.lastConsumedShotReplay).toBe(-1);
    expect(model.skippedFeedSummaries).toEqual([]);
  });
});

describe('computeSkippedOpponentShots', () => {
  test('counts strokes between pending and incoming replay', () => {
    const pending = postBreakState();
    const incoming: BilliardsMatchState = {
      ...pending,
      shotsTaken: 4,
      lastShotReplay: { ...(pending.lastShotReplay!), shotsTaken: 4 },
    };
    const skipped = computeSkippedOpponentShots(1, -1, pending, incoming);
    expect(skipped?.summary).toContain('Opponent');
    expect(skipped?.ackedKeys).toContain('shot:1');
    expect(skipped?.ackedKeys).toContain('shot:2');
    expect(skipped?.ackedKeys).toContain('shot:3');
  });
});
