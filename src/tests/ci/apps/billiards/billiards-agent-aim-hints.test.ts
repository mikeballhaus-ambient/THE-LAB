import { gradeAgentShot } from '@/apps/billiards/back-end/agent';
import {
  formatAgentPlacementHints,
  formatAgentShotAimHints,
  formatAgentShotRejectionHint,
  rankAgentPocketShots,
  shotAngleHitsLegalObject,
  suggestAgentPlacementCandidates,
  tableAimDegreesFromTo,
} from '@/apps/billiards/shared/billiards-agent-aim-hints';
import { applyBilliardsAgentShotTierPolicy } from '@/apps/billiards/shared/billiards-agent-shot-policy';
import { billiardsDifficultyExecutionNote } from '@/apps/billiards/shared/billiards-agent-difficulty';
import { buildUserPrompt } from '@/apps/billiards/back-end/agent';
import { objectBallPocketPathBlocker } from '@/apps/billiards/shared/billiard-shot-hint-paths';
import { TABLE_POCKET_CENTERS } from '@/apps/billiards/shared/billiards-types';
import type { BilliardsMatchState } from '@/apps/billiards/shared/billiards-types';

function aimState(overrides: Partial<BilliardsMatchState> = {}): BilliardsMatchState {
  return {
    phase: 'aim',
    layoutLocked: true,
    rulesProfile: 'eight-ball',
    balls: [
      { id: 'cue', number: 0, x: 200, y: 250, pocketed: false },
      { id: '9', number: 9, x: 600, y: 280, pocketed: false },
      { id: '11', number: 11, x: 640, y: 300, pocketed: false },
    ],
    ballInHand: false,
    ballInHandSeat: null,
    placementZone: 'table',
    turnHistory: [],
    shotsTaken: 2,
    seatGroups: { 1: 'solids', 2: 'stripes' },
    resultMessage: null,
    winnerSeat: null,
    ...overrides,
  };
}

describe('tableAimDegreesFromTo', () => {
  test('points right and down', () => {
    expect(tableAimDegreesFromTo(0, 0, 100, 0)).toBeCloseTo(0, 5);
    expect(tableAimDegreesFromTo(0, 0, 0, 100)).toBeCloseTo(90, 5);
  });
});

describe('formatAgentShotAimHints', () => {
  test('recommends pocket aim with power', () => {
    const lines = formatAgentShotAimHints(aimState(), 2);
    const joined = lines.join('\n');
    expect(joined).toContain('RECOMMENDED POCKET SHOT');
    expect(joined).toMatch(/pocket aimDeg=\d+/);
    expect(joined).toMatch(/power=0\.\d+/);
    expect(joined).toMatch(/Clear pocket lines this turn:/);
    expect(joined).toContain('Legal first-contact object balls');
  });

  test('boss hints use precise angles and suggested tool args', () => {
    const joined = formatAgentShotAimHints(aimState(), 2, 'boss').join('\n');
    expect(joined).toContain('Suggested tool args');
    expect(joined).toContain('EASY MAKE lines');
    expect(joined).toMatch(/pocket aimDeg=\d+\.\d/);
  });
});

describe('rankAgentPocketShots', () => {
  test('ranks stripe balls for seat 2', () => {
    const ranked = rankAgentPocketShots(aimState(), 2);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((h) => h.ballNumber === 9 || h.ballNumber === 11)).toBe(true);
  });
});

describe('path obstruction hints', () => {
  test('reports cue blocker on center-line toward target', () => {
    const state = aimState({
      balls: [
        { id: 'cue', number: 0, x: 150, y: 250, pocketed: false },
        { id: '11', number: 11, x: 420, y: 250, pocketed: false },
        { id: '9', number: 9, x: 780, y: 250, pocketed: false },
      ],
    });
    const lines = formatAgentShotAimHints(state, 2).join('\n');
    expect(lines).toContain('PATH OBSTRUCTIONS');
    expect(lines).toMatch(/#11 first/);
  });

  test('object roll blocker excludes pocket line from rankings', () => {
    const pocket = TABLE_POCKET_CENTERS[1]!;
    const balls = [
      { id: 'cue', number: 0, x: 200, y: 400, pocketed: false },
      { id: '9', number: 9, x: 500, y: 250, pocketed: false },
      { id: '11', number: 11, x: 500, y: 180, pocketed: false },
    ];
    expect(objectBallPocketPathBlocker(balls[1]!, pocket, balls)).toBe(11);
    const ranked = rankAgentPocketShots(
      aimState({
        balls,
      }),
      2,
    );
    const hitsMid = ranked.some((h) => h.pocketIndex === 1 && h.ballNumber === 9);
    expect(hitsMid).toBe(false);
  });
});

describe('shotAngleHitsLegalObject', () => {
  test('first contact along ray must be a legal object ball', () => {
    expect(shotAngleHitsLegalObject(aimState(), 2, 90)).toBe(false);
  });

  test('accepts pocket aim line toward a legal ball', () => {
    const ranked = rankAgentPocketShots(aimState(), 2);
    const best = ranked[0];
    expect(best).toBeDefined();
    expect(shotAngleHitsLegalObject(aimState(), 2, best!.pocketAimDeg)).toBe(true);
    expect(() =>
      gradeAgentShot({ angleDeg: best!.pocketAimDeg, power: best!.suggestedPower }, aimState(), 2),
    ).not.toThrow();
  });
});

describe('formatAgentPlacementHints', () => {
  test('suggests multiple coordinates from layout', () => {
    const state: BilliardsMatchState = {
      phase: 'place_cue',
      layoutLocked: true,
      rulesProfile: 'eight-ball',
      balls: [
        { id: '3', number: 3, x: 520, y: 200, pocketed: false },
        { id: '10', number: 10, x: 700, y: 260, pocketed: false },
        { id: '12', number: 12, x: 680, y: 320, pocketed: false },
      ],
      ballInHand: true,
      ballInHandSeat: 2,
      placementZone: 'table',
      turnHistory: [],
      shotsTaken: 1,
      seatGroups: { 1: 'solids', 2: 'stripes' },
      resultMessage: null,
      winnerSeat: null,
    };
    const picks = suggestAgentPlacementCandidates(state, 2, 'table');
    expect(picks.length).toBeGreaterThanOrEqual(2);
    const xs = picks.map((p) => Math.round(p.x));
    expect(new Set(xs).size).toBeGreaterThan(1);
    expect(formatAgentPlacementHints(state, 2).join('\n')).toContain('PLACEMENT HINTS');
  });
});

describe('gradeAgentShot aim validation', () => {
  test('rejects 90° when cue must shoot right toward stripes', () => {
    expect(() => gradeAgentShot({ angleDeg: 90, power: 0.4 }, aimState(), 2)).toThrow(/does not first-contact/);
  });

  test('tier policy does not rewrite LLM shot arguments', () => {
    const state = aimState();
    const raw = { angleDeg: 42.5, power: 0.33, englishX: 0.1, englishY: -0.05 };
    expect(applyBilliardsAgentShotTierPolicy({ ...raw }, state, 2, 'boss')).toEqual(raw);
    expect(applyBilliardsAgentShotTierPolicy({ ...raw }, state, 2, 'easy')).toEqual(raw);
  });

  test('accepts angle toward a legal stripe', () => {
    const deg = tableAimDegreesFromTo(200, 250, 600, 280);
    const move = gradeAgentShot({ angleDeg: deg, power: 0.4 }, aimState(), 2);
    expect(move.type).toBe('shot');
  });

  test('buildUserPrompt includes shot authority note on boss', () => {
    const prompt = buildUserPrompt(aimState(), 2, 'boss');
    expect(prompt).toContain('EASY MAKE');
    expect(billiardsDifficultyExecutionNote('boss')).toMatch(/never rewrites/i);
    expect(prompt).toMatch(/never rewrites/i);
    expect(prompt).toContain('Suggested tool args');
  });

  test('rejection hint names nearest pocket line', () => {
    const state = aimState();
    const ranked = rankAgentPocketShots(state, 2);
    expect(ranked[0]).toBeDefined();
    const msg = formatAgentShotRejectionHint(state, 2, 90, 'boss');
    expect(msg).toMatch(/pocket aimDeg=/);
    expect(msg).toMatch(/Off by/);
  });
});
