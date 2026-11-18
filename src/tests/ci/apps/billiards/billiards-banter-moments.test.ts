import {
  detectBilliardsBanterMoment,
  formatBilliardsShootingNextForBanter,
  shouldEmitBilliardsPocketBanter,
} from '@/apps/billiards/shared/billiards-banter-moments';
import type { MatchView } from '@/shared/game-platform/types';
import { OPEN_BILLIARDS_SEAT_GROUPS, type BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';

function baseState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
      { id: '3', number: 3, x: 500, y: 250, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 1,
    seatGroups: { 1: 'solids', 2: 'stripes' },
    resultMessage: null,
    winnerSeat: null,
    ...overrides,
  };
}

function matchView(
  state: BilliardsMatchState,
  extra: Partial<MatchView> = {},
): MatchView {
  return {
    matchId: '00000000-0000-4000-8000-000000000001',
    gameId: 'billiards',
    status: 'active',
    opponentKind: 'ai',
    yourSeat: 1,
    currentSeat: 2,
    player1Id: 1,
    player2Id: 0,
    difficulty: 'medium',
    state,
    turnRemainingMs: 60_000,
    scores: {},
    winnerUserId: null,
    ...extra,
  };
}

describe('detectBilliardsBanterMoment', () => {
  test('returns null when not vs AI', () => {
    expect(
      detectBilliardsBanterMoment(null, matchView(baseState(), { opponentKind: 'human' })),
    ).toBeNull();
  });

  test('skips assistant routine legal pocket banter', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '7', number: 7, x: 500, y: 250, pocketed: false },
        ],
      }),
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 2, summary: 'Shot — pocketed 7 (40% power)' }],
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '7', number: 7, x: 500, y: 250, pocketed: true, pocketedBySeat: 2 },
        ],
      }),
    );
    expect(detectBilliardsBanterMoment(prev, next)).toBeNull();
  });

  test('assistant legal assigned pocket ending visit emits ownership highlight', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '5', number: 5, x: 500, y: 250, pocketed: false },
        ],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 2, summary: 'Shot — pocketed 5 (40% power)' }],
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '5', number: 5, x: 500, y: 250, pocketed: true, pocketedBySeat: 2 },
        ],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('highlight');
    expect(moment?.moverSeat).toBe(2);
    expect(moment?.detail).toContain('their** assigned solids');
    expect(moment?.detail).toContain('Forbidden');
  });

  test('assistant wrong-group pocket still emits banter', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '13', number: 13, x: 400, y: 250, pocketed: false },
        ],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 2, summary: 'Shot — pocketed 13 (40% power)' }],
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '13', number: 13, x: 400, y: 250, pocketed: true, pocketedBySeat: 2 },
        ],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('pocket');
    expect(moment?.moverSeat).toBe(2);
    expect(moment?.detail).toContain('Wrong-group');
  });

  test('shouldEmitBilliardsPocketBanter skips legal group balls for both players', () => {
    const state = baseState({
      seatGroups: { 1: 'stripes', 2: 'solids' },
    });
    expect(shouldEmitBilliardsPocketBanter(2, 1, [3], state)).toBe(false);
    expect(shouldEmitBilliardsPocketBanter(1, 1, [9], state)).toBe(false);
    expect(shouldEmitBilliardsPocketBanter(2, 1, [13], state)).toBe(true);
    expect(shouldEmitBilliardsPocketBanter(1, 1, [5], state)).toBe(true);
  });

  test('mixed-group pocket clarifies one assigned stripe vs wrong solid', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 1, summary: 'prior' }],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '13', number: 13, x: 400, y: 250, pocketed: false },
          { id: '5', number: 5, x: 450, y: 260, pocketed: false },
        ],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [
          { seat: 1, summary: 'prior' },
          { seat: 1, summary: 'Shot — pocketed 13, 5 (50% power)' },
        ],
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '13', number: 13, x: 400, y: 250, pocketed: true, pocketedBySeat: 1 },
          { id: '5', number: 5, x: 450, y: 260, pocketed: true, pocketedBySeat: 1 },
        ],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('pocket');
    expect(moment?.detail).toContain('assigned-group (stripes): 13');
    expect(moment?.detail).toContain('Wrong-group');
    expect(moment?.detail).toContain('1/7 pocketed');
    expect(moment?.detail).toContain('still on the table');
    expect(moment?.detail).toContain('Do not say "two down"');
  });

  test('skips open-table group-claim banter on legal break pocket', () => {
    const prev = matchView(
      baseState({
        seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
        turnHistory: [],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '9', number: 9, x: 400, y: 250, pocketed: false },
          { id: '10', number: 10, x: 410, y: 250, pocketed: false },
          { id: '11', number: 11, x: 500, y: 250, pocketed: false },
          { id: '12', number: 12, x: 420, y: 250, pocketed: false },
          { id: '13', number: 13, x: 430, y: 250, pocketed: false },
          { id: '14', number: 14, x: 440, y: 250, pocketed: false },
          { id: '15', number: 15, x: 450, y: 250, pocketed: false },
        ],
      }),
      { currentSeat: 1 },
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 1, summary: 'Shot — stripes for seat 1 — pocketed 11 (80% power)' }],
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '9', number: 9, x: 400, y: 250, pocketed: false },
          { id: '10', number: 10, x: 410, y: 250, pocketed: false },
          { id: '11', number: 11, x: 500, y: 250, pocketed: true, pocketedBySeat: 1 },
          { id: '12', number: 12, x: 420, y: 250, pocketed: false },
          { id: '13', number: 13, x: 430, y: 250, pocketed: false },
          { id: '14', number: 14, x: 440, y: 250, pocketed: false },
          { id: '15', number: 15, x: 450, y: 250, pocketed: false },
        ],
      }),
      { currentSeat: 1 },
    );
    expect(detectBilliardsBanterMoment(prev, next)).toBeNull();
  });

  test('mover seat follows summary for seat N when history seat mismatches', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '7', number: 7, x: 500, y: 250, pocketed: false },
        ],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const next = matchView(
      baseState({
        shotsTaken: 2,
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 1, summary: 'Shot — solids for seat 2 — pocketed 7 (83% power)' }],
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '7', number: 7, x: 500, y: 250, pocketed: true, pocketedBySeat: 2 },
        ],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    expect(detectBilliardsBanterMoment(prev, next)).toBeNull();
  });

  test('mover seat follows lastShotReplay when history seat mismatches', () => {
    const prev = matchView(
      baseState({
        seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
        turnHistory: [],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '1', number: 1, x: 500, y: 250, pocketed: false },
        ],
      }),
    );
    const next = matchView(
      baseState({
        shotsTaken: 1,
        seatGroups: { 1: 'stripes', 2: 'solids' },
        turnHistory: [{ seat: 1, summary: 'Shot — solids for seat 2 — pocketed 1 (60% power)' }],
        lastShotReplay: {
          seat: 2,
          angleRad: 0,
          power: 0.6,
          englishX: 0,
          englishY: 0,
          shotsTaken: 1,
          preShotBalls: [
            { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
            { id: '1', number: 1, x: 500, y: 250, pocketed: false },
          ],
          shotVarianceResolved: true,
        },
        balls: [
          { id: 'cue', number: 0, x: 320, y: 260, pocketed: false },
          { id: '1', number: 1, x: 500, y: 250, pocketed: true, pocketedBySeat: 2 },
        ],
      }),
      { currentSeat: 2 },
    );
    expect(detectBilliardsBanterMoment(prev, next)).toBeNull();
  });

  test('agent dry break — highlight when turn passes to human', () => {
    const prev = matchView(
      baseState({
        seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
        shotsTaken: 0,
        turnHistory: [],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const next = matchView(
      baseState({
        seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
        shotsTaken: 1,
        turnHistory: [{ seat: 2, summary: 'Shot (52% power)' }],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('highlight');
    expect(moment?.moverSeat).toBe(2);
    expect(moment?.detail).toContain('dry shot');
    expect(moment?.detail).toContain('still open');
    expect(moment?.detail).toContain('Shooting next: human player');
  });

  test('wrong ball without "turn passes" text — still highlight when no ball in hand', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'solids', 2: 'stripes' },
        turnHistory: [],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'solids', 2: 'stripes' },
        ballInHand: false,
        phase: 'aim',
        turnHistory: [{ seat: 2, summary: 'Wrong ball first (40% power)' }],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('highlight');
    expect(moment?.detail).toContain('not a scratch');
  });

  test('wrong ball first (turn only) — highlight not scratch banter', () => {
    const prev = matchView(
      baseState({
        seatGroups: { 1: 'solids', 2: 'stripes' },
        turnHistory: [{ seat: 1, summary: 'Shot — pocketed 3 (40% power)' }],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const next = matchView(
      baseState({
        seatGroups: { 1: 'solids', 2: 'stripes' },
        ballInHand: false,
        phase: 'aim',
        turnHistory: [
          { seat: 1, summary: 'Shot — pocketed 3 (40% power)' },
          {
            seat: 1,
            summary: 'Wrong ball first — turn passes to opponent (38% power)',
          },
        ],
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('highlight');
    expect(moment?.detail).toContain('turn only');
    expect(moment?.detail).not.toContain('places the cue');
    expect(moment?.detail).toContain('Shooting next');
  });

  test('detects scratch from summary', () => {
    const prev = matchView(baseState({ turnHistory: [] }));
    const next = matchView(
      baseState({
        phase: 'place_cue',
        ballInHand: true,
        ballInHandSeat: 1,
        turnHistory: [{ seat: 2, summary: 'Scratch — ball in hand (55% power)' }],
      }),
      { currentSeat: 1 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('scratch');
    expect(moment?.moverSeat).toBe(2);
    expect(moment?.detail).toContain('Scratch — ball in hand (55% power)');
    expect(moment?.detail).toContain('Shooting next: human places **their** cue');
    expect(moment?.detail).toContain('human player** places **their own**');
    expect(moment?.detail).toContain('does **not** place');
  });

  test('assistant kitchen scratch — human places their cue in kitchen', () => {
    const next = matchView(
      baseState({
        phase: 'place_cue',
        ballInHand: true,
        ballInHandSeat: 1,
        placementZone: 'kitchen',
        turnHistory: [{ seat: 2, summary: 'Scratch — ball in hand (40% power)' }],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const detail = formatBilliardsShootingNextForBanter(next, baseState(next.state as BilliardsMatchState));
    expect(detail).toContain('kitchen');
    expect(detail).toContain('their own');
    expect(detail).toContain('does **not** place');
  });

  test('human scratch — assistant places cue and mover is human', () => {
    const prev = matchView(
      baseState({
        turnHistory: [{ seat: 1, summary: 'Shot — pocketed 13 (25% power)' }],
        balls: [
          { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
          { id: '13', number: 13, x: 500, y: 250, pocketed: true, pocketedBySeat: 1 },
        ],
      }),
      { yourSeat: 1, currentSeat: 1 },
    );
    const next = matchView(
      baseState({
        shotsTaken: 3,
        phase: 'place_cue',
        ballInHand: true,
        ballInHandSeat: 2,
        balls: [
          { id: '6', number: 6, x: 400, y: 250, pocketed: true, pocketedBySeat: 1 },
          { id: '15', number: 15, x: 410, y: 250, pocketed: true, pocketedBySeat: 1 },
        ],
        turnHistory: [
          { seat: 1, summary: 'Shot — pocketed 13 (25% power)' },
          {
            seat: 1,
            summary: 'Scratch — ball in hand — pocketed 6, 15 (100% power)',
          },
        ],
        lastShotReplay: {
          seat: 1,
          angleRad: 0,
          power: 1,
          englishX: 0,
          englishY: 0,
          shotsTaken: 3,
          preShotBalls: [{ id: 'cue', number: 0, x: 200, y: 250, pocketed: false }],
          shotVarianceResolved: true,
        },
      }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const moment = detectBilliardsBanterMoment(prev, next);
    expect(moment?.kind).toBe('scratch');
    expect(moment?.moverSeat).toBe(1);
    expect(moment?.detail).toContain('Human shooter —');
    expect(moment?.detail).toContain('Lab Assistant** places **their own**');
    expect(moment?.detail).toContain('human fouled');
    /** Balls that dropped on the foul stroke stay down — the prompt must not doubt them. */
    expect(moment?.detail).toContain('stay down');
    expect(moment?.detail).toContain('solids 6');
    expect(moment?.detail).toContain('stripes 15');
  });

  test('detects match loss when human wins', () => {
    const prev = matchView(baseState());
    const next = matchView(baseState(), {
      status: 'finished',
      winnerUserId: 1,
      player1Id: 1,
      player2Id: 0,
    });
    expect(detectBilliardsBanterMoment(prev, next)).toEqual({ kind: 'match_loss', moverSeat: 1 });
  });

  test('match loss from table winnerSeat when winnerUserId is not set yet', () => {
    const prev = matchView(
      baseState({ phase: 'aim', winnerSeat: null }),
      { yourSeat: 1, currentSeat: 2 },
    );
    const next = matchView(
      baseState({
        phase: 'finished',
        winnerSeat: 1,
        balls: baseState().balls.map((b) => ({ ...b, pocketed: b.number === 8 })),
      }),
      {
        status: 'finished',
        winnerUserId: undefined,
        yourSeat: 1,
        currentSeat: 1,
      },
    );
    expect(detectBilliardsBanterMoment(prev, next)).toEqual({ kind: 'match_loss', moverSeat: 1 });
  });
});
