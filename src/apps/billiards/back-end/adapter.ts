import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import type { PlatformLlmReasoningEffort } from '@/shared/types/platform-llm-completion';
import type {
  GameDifficulty,
  GameServerAdapter,
  MatchCreateConfig,
  ValidateMoveResult,
} from '@/shared/game-platform/types';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import { runAgentMoveLoop } from '@/shared/game-platform/agent-loop';
import { BILLIARDS_SUBMIT_SHOT_TOOL_ID } from '../shared/billiards-agent-move-schema';
import { BILLIARDS_PLACE_CUE_TOOL_ID } from '../shared/billiards-agent-place-schema';
import {
  BILLIARDS_AGENT_PURPOSE,
  buildSystemPrompt,
  buildPlacementSystemPrompt,
  buildUserPrompt,
  buildPlacementUserPrompt,
  gradeAgentShot,
  gradeAgentPlaceCue,
  retryUserHint,
  placementRetryUserHint,
  attemptNote,
  toolResultHint,
  placementToolResultHint,
} from './agent';
import {
  buildRackedBallsWithVariance,
  createPhysicsVarianceSeed,
  resolveShotForSimulation,
} from '../shared/billiards-break-variance';
import {
  canPlaceBallAt,
  clearObjectBalls,
  createEmptyPracticeState,
  findBall,
  findOpenPlacement,
  nextObjectBallId,
  objectBall,
  updateBallPosition,
} from '../shared/billiards-layout';
import { simulateShot } from '../shared/billiards-physics';
import { stampShotWithAuthoritativeCue } from '../shared/billiards-shot-stamp';
import {
  applyEightBallAfterShot,
  applyFreePlayAfterShot,
  applyNineBallAfterShot,
  normalizeBilliardsSeatGroups,
  reconcileCompetitiveCueBall,
} from '../shared/billiards-rules';
import { OPEN_BILLIARDS_SEAT_GROUPS } from '../shared/billiards-types';
import type { BilliardsMatchState, BilliardsShotPayload } from '../shared/billiards-types';
import { BILLIARDS_GAME_IDS } from './catalog';
import {
  catalogHeadToHeadWagerSettlementLines,
  resolveCatalogAiMatchWagerQuarks,
  resolveCatalogPvpWagerQuarks,
} from '@/shared/game-platform/catalog-match-wager';

function asRecord(move: unknown): Record<string, unknown> | null {
  if (!move || typeof move !== 'object') {
    return null;
  }
  return move as Record<string, unknown>;
}

function moveType(move: unknown): string | null {
  const m = asRecord(move);
  return typeof m?.type === 'string' ? m.type : null;
}

function normalizeState(state: unknown): BilliardsMatchState {
  if (!state || typeof state !== 'object') {
    return createEmptyPracticeState('free');
  }
  const s = state as BilliardsMatchState;
  const normalized: BilliardsMatchState = {
    phase: s.phase ?? 'setup',
    layoutLocked: Boolean(s.layoutLocked),
    rulesProfile: s.rulesProfile ?? 'free',
    balls: Array.isArray(s.balls) ? s.balls : [],
    ballInHand: Boolean(s.ballInHand),
    ballInHandSeat: s.ballInHandSeat ?? null,
    placementZone: s.placementZone ?? 'table',
    turnHistory: Array.isArray(s.turnHistory) ? s.turnHistory : [],
    shotsTaken: typeof s.shotsTaken === 'number' ? s.shotsTaken : 0,
    seatGroups: normalizeBilliardsSeatGroups({
      ...(s as BilliardsMatchState),
      seatGroups: s.seatGroups ?? { ...OPEN_BILLIARDS_SEAT_GROUPS },
    }),
    resultMessage: s.resultMessage ?? null,
    winnerSeat: s.winnerSeat ?? null,
    lastShotReplay: s.lastShotReplay ?? null,
    lastCuePlaceReplay: s.lastCuePlaceReplay ?? null,
    continueTurnSeat: s.continueTurnSeat ?? null,
    wagerQuarks:
      typeof (s as BilliardsMatchState).wagerQuarks === 'number'
        ? Math.max(0, (s as BilliardsMatchState).wagerQuarks!)
        : 0,
    physicsVarianceSeed:
      typeof s.physicsVarianceSeed === 'number' ? (s.physicsVarianceSeed >>> 0) : undefined,
  };
  if (
    normalized.layoutLocked &&
    normalized.rulesProfile !== 'free' &&
    normalized.phase !== 'finished'
  ) {
    return reconcileCompetitiveCueBall(
      normalized,
      normalized.ballInHandSeat ?? normalized.continueTurnSeat ?? 1,
    );
  }
  return normalized;
}

function attachLastShotReplay(
  preShot: BilliardsMatchState,
  applied: BilliardsMatchState,
  playerSeat: number,
  shot: BilliardsShotPayload,
): BilliardsMatchState {
  return {
    ...applied,
    lastShotReplay: {
      seat: playerSeat,
      angleRad: shot.angleRad,
      power: shot.power,
      englishX: shot.englishX,
      englishY: shot.englishY,
      shotsTaken: applied.shotsTaken,
      preShotBalls: preShot.balls.map((b) => ({ ...b })),
      shotVarianceResolved: true,
    },
  };
}

function appendHistory(state: BilliardsMatchState, seat: number, summary: string): BilliardsMatchState {
  return {
    ...state,
    turnHistory: [...state.turnHistory, { seat, summary }],
  };
}

function openingTurnSeat(config: MatchCreateConfig): 1 | 2 {
  return config.startingSeat === 2 ? 2 : 1;
}

function parseShot(move: Record<string, unknown>): BilliardsShotPayload | null {
  const angleRad = Number(move.angleRad);
  const power = Number(move.power);
  const englishX = Number(move.englishX ?? 0);
  const englishY = Number(move.englishY ?? 0);
  if (!Number.isFinite(angleRad) || !Number.isFinite(power)) {
    return null;
  }
  const payload: BilliardsShotPayload = {
    angleRad,
    power: Math.max(0, Math.min(1, power)),
    englishX: Math.max(-1, Math.min(1, englishX)),
    englishY: Math.max(-1, Math.min(1, englishY)),
  };
  if (move.cueBallX != null && move.cueBallY != null) {
    payload.cueBallX = Number(move.cueBallX);
    payload.cueBallY = Number(move.cueBallY);
  }
  return payload;
}

export const billiardsAdapterCore: GameServerAdapter = {
  gameId: BILLIARDS_GAME_IDS.PRACTICE,

  createInitialState(config: MatchCreateConfig): BilliardsMatchState {
    const profile =
      config.rules?.rulesProfile ??
      (config.gameId === BILLIARDS_GAME_IDS.EIGHT_BALL ? 'eight-ball' : 'free');
    if (config.opponentKind === 'solo' || config.gameId === BILLIARDS_GAME_IDS.PRACTICE) {
      return createEmptyPracticeState(profile);
    }
    const varianceSeed = createPhysicsVarianceSeed();
    const { balls, physicsVarianceSeed } = buildRackedBallsWithVariance(profile, varianceSeed);
    const state: BilliardsMatchState = {
      phase: 'aim',
      layoutLocked: true,
      rulesProfile: profile,
      balls,
      physicsVarianceSeed,
      ballInHand: false,
      ballInHandSeat: null,
      placementZone: 'table',
      turnHistory: [],
      shotsTaken: 0,
      seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
      resultMessage: null,
      winnerSeat: null,
      wagerQuarks: Math.max(0, config.rules?.wagerQuarks ?? 0),
      continueTurnSeat: openingTurnSeat(config),
    };
    return state;
  },

  validateMove(state: unknown, move: unknown, playerSeat: number): ValidateMoveResult {
    void playerSeat;
    const s = normalizeState(state);
    const type = moveType(move);
    if (!type) {
      return { ok: false, error: 'Move must include type' };
    }

    if (type === 'layout/endPractice') {
      if (s.phase === 'rolling') {
        return { ok: false, error: 'Wait for balls to stop' };
      }
      return { ok: true };
    }

    if (type === 'layout/reopen') {
      if (s.phase === 'rolling' || s.phase === 'finished') {
        return { ok: false, error: 'Wait for balls to stop' };
      }
      if (s.rulesProfile !== 'free') {
        return { ok: false, error: 'Layout locked for this rules profile' };
      }
      if (!s.layoutLocked || s.phase === 'setup') {
        return { ok: false, error: 'Layout is already open' };
      }
      return { ok: true };
    }

    if (s.phase === 'rolling' || s.phase === 'finished') {
      return { ok: false, error: 'Wait for balls to stop' };
    }

    if (type === 'layout/lock') {
      if (s.layoutLocked) {
        return { ok: false, error: 'Already started' };
      }
      if (s.phase !== 'setup') {
        return { ok: false, error: 'Not in setup' };
      }
      const cue = s.balls.find((b) => b.number === 0 && !b.pocketed);
      if (!cue) {
        return { ok: false, error: 'Cue ball required' };
      }
      const hasObjectBall = s.balls.some((b) => !b.pocketed && b.number > 0);
      if (!hasObjectBall) {
        return { ok: false, error: 'Add at least one ball to the table' };
      }
      return { ok: true };
    }

    if (type.startsWith('layout/')) {
      if (s.layoutLocked) {
        return { ok: false, error: 'Layout is locked' };
      }
      if (s.phase !== 'setup') {
        return { ok: false, error: 'Layout edits only in setup' };
      }
      if (type === 'layout/placeBall') {
        const m = asRecord(move);
        const ballId = String(m?.ballId ?? '');
        const x = Number(m?.x);
        const y = Number(m?.y);
        if (!ballId || !Number.isFinite(x) || !Number.isFinite(y)) {
          return { ok: false, error: 'Invalid placement' };
        }
        if (!canPlaceBallAt(s.balls, x, y, ballId, 'table')) {
          return { ok: false, error: 'Illegal ball position' };
        }
      }
      if (type === 'layout/addBall') {
        const m = asRecord(move);
        const num = m?.number != null ? Number(m.number) : undefined;
        const spec = nextObjectBallId(s.balls, num);
        if (!spec) {
          return { ok: false, error: 'Ball already on table' };
        }
        const spot = findOpenPlacement(s.balls);
        if (!spot) {
          return { ok: false, error: 'No space on table' };
        }
      }
      return { ok: true };
    }

    if (type === 'cue/place') {
      if (s.phase !== 'place_cue' || !s.ballInHand) {
        return { ok: false, error: 'Not ball in hand' };
      }
      if (s.ballInHandSeat != null && s.ballInHandSeat !== playerSeat) {
        return { ok: false, error: 'Not your ball in hand' };
      }
      const m = asRecord(move);
      const x = Number(m?.x);
      const y = Number(m?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return { ok: false, error: 'Invalid cue position' };
      }
      if (!canPlaceBallAt(s.balls, x, y, 'cue', s.placementZone)) {
        return { ok: false, error: 'Illegal cue placement' };
      }
      return { ok: true };
    }

    if (type === 'shot') {
      if (s.phase !== 'aim') {
        return { ok: false, error: 'Not ready to shoot' };
      }
      const m = asRecord(move);
      if (!m || !parseShot(m)) {
        return { ok: false, error: 'Invalid shot' };
      }
      return { ok: true };
    }

    return { ok: false, error: 'Unknown move type' };
  },

  applyMove(state: unknown, move: unknown, playerSeat: number): BilliardsMatchState {
    const s = normalizeState(state);
    const type = moveType(move);
    const m = asRecord(move);

    if (type === 'layout/autoRack') {
      const varianceSeed = createPhysicsVarianceSeed();
      const { balls, physicsVarianceSeed } = buildRackedBallsWithVariance(s.rulesProfile, varianceSeed);
      return { ...s, balls, physicsVarianceSeed };
    }
    if (type === 'layout/endPractice') {
      return createEmptyPracticeState(s.rulesProfile);
    }
    if (type === 'layout/clear') {
      return { ...s, balls: clearObjectBalls(s) };
    }
    if (type === 'layout/placeBall' && m) {
      const ballId = String(m.ballId);
      let next = updateBallPosition(s, ballId, Number(m.x), Number(m.y));
      if (!findBall(next, ballId) && m.number != null) {
        const num = Number(m.number);
        next = {
          ...next,
          balls: [...next.balls, objectBall(ballId, num, Number(m.x), Number(m.y))],
        };
      }
      return next;
    }
    if (type === 'layout/lock') {
      return appendHistory(
        {
          ...s,
          layoutLocked: true,
          phase: 'aim',
          ballInHand: false,
          shotsTaken: 0,
          seatGroups: { ...OPEN_BILLIARDS_SEAT_GROUPS },
        },
        playerSeat,
        'Practice started',
      );
    }
    if (type === 'layout/reopen') {
      return {
        ...s,
        layoutLocked: false,
        phase: 'setup',
        ballInHand: false,
        placementZone: 'table',
      };
    }
    if (type === 'layout/addBall' && m) {
      const num = m.number != null ? Number(m.number) : undefined;
      const spec = nextObjectBallId(s.balls, num);
      const spot = spec ? findOpenPlacement(s.balls) : null;
      if (!spec || !spot) {
        return s;
      }
      return {
        ...s,
        balls: [...s.balls, objectBall(spec.id, spec.number, spot.x, spot.y)],
      };
    }
    if (type === 'cue/place' && m) {
      const x = Number(m.x);
      const y = Number(m.y);
      const withoutCue = s.balls.filter((b) => b.number !== 0);
      const placed = objectBall('cue', 0, x, y);
      const next: BilliardsMatchState = {
        ...s,
        balls: [...withoutCue, placed],
        phase: 'aim',
        ballInHand: false,
        ballInHandSeat: null,
        continueTurnSeat: playerSeat,
        /** Aim stroke is committed — head-string rule applies only while still in kitchen BIH. */
        placementZone: s.placementZone === 'kitchen' ? 'kitchen' : 'table',
      };
      const withHistory = appendHistory(next, playerSeat, 'Cue ball placed');
      if (s.layoutLocked) {
        return {
          ...withHistory,
          lastCuePlaceReplay: {
            seat: playerSeat,
            x,
            y,
            placementZone: s.placementZone,
            historyIndex: withHistory.turnHistory.length,
            prePlaceBalls: s.balls.map((b) => ({ ...b })),
          },
        };
      }
      return withHistory;
    }
    if (type === 'shot' && m) {
      const rawShot = parseShot(m)!;
      const withVariance = resolveShotForSimulation(s, rawShot);
      const { state: rollingLayout, shot } = stampShotWithAuthoritativeCue(s, withVariance);
      const rolling: BilliardsMatchState = { ...rollingLayout, phase: 'rolling' };
      const sim = simulateShot(rolling, shot);
      const outcome =
        s.rulesProfile === 'eight-ball'
          ? applyEightBallAfterShot(s, sim, playerSeat)
          : s.rulesProfile === 'nine-ball'
            ? applyNineBallAfterShot(s, sim, playerSeat)
            : applyFreePlayAfterShot(s, sim, playerSeat);
      let withHistory = appendHistory(outcome.state, playerSeat, outcome.summary);
      if (s.layoutLocked && s.rulesProfile !== 'free') {
        withHistory = reconcileCompetitiveCueBall(withHistory, playerSeat);
      }
      if (s.layoutLocked) {
        return attachLastShotReplay(s, withHistory, playerSeat, shot);
      }
      return withHistory;
    }
    return s;
  },

  scores(state: unknown): Record<number, number> {
    const s = normalizeState(state);
    if (s.phase === 'finished' && s.winnerSeat === 1) {
      return { 1: 1, 2: 0 };
    }
    return { 1: 0, 2: 0 };
  },

  isFinished(state: unknown): boolean {
    return normalizeState(state).phase === 'finished';
  },

  redactStateForSeat(state: unknown, viewerSeat: number): BilliardsMatchState {
    void viewerSeat;
    return normalizeState(state);
  },

  winnerSeat(state: unknown): number | null {
    return normalizeState(state).winnerSeat;
  },

  onTurnTimeout(state: unknown): unknown {
    return state;
  },

  nextSeatAfterMove(): number {
    return 1;
  },

  summarizeMove(move: unknown): string {
    const type = moveType(move);
    if (type === 'layout/autoRack') {
      return 'Auto rack';
    }
    if (type === 'layout/clear') {
      return 'Clear table';
    }
    if (type === 'layout/lock') {
      return 'Start practice';
    }
    if (type === 'layout/endPractice') {
      return 'End practice';
    }
    if (type === 'layout/reopen') {
      return 'Edit layout';
    }
    if (type === 'shot') {
      return 'Shot';
    }
    return type ?? 'Move';
  },
};

export const billiardsPracticeAdapter: GameServerAdapter = {
  ...billiardsAdapterCore,
  gameId: BILLIARDS_GAME_IDS.PRACTICE,
};

/** Last resort when `continueTurnSeat` was not written on older state rows. */
function inferOnClockFromLastShotSummary(
  applied: BilliardsMatchState,
  moverSeat: number,
): 1 | 2 | null {
  const last = applied.turnHistory.at(-1);
  if (last?.seat !== moverSeat) {
    return null;
  }
  const summary = last.summary.trim();
  if (!summary) {
    return null;
  }
  const lower = summary.toLowerCase();
  if (
    lower.includes('ball in hand') ||
    lower.includes('wrong ball') ||
    lower.includes('did not hit') ||
    lower.includes('head string')
  ) {
    return moverSeat === 1 ? 2 : 1;
  }
  if (lower.includes('pocketed')) {
    return moverSeat === 2 ? 2 : 1;
  }
  if (/^shot\b/i.test(summary) && !lower.includes('pocketed')) {
    return moverSeat === 1 ? 2 : 1;
  }
  return null;
}

function nextSeatAfterCompetitiveShot(
  applied: BilliardsMatchState,
  moverSeat: number,
): number | null {
  if (applied.phase === 'finished') {
    return null;
  }
  if (applied.phase === 'place_cue') {
    return applied.ballInHandSeat ?? (moverSeat === 1 ? 2 : 1);
  }
  if (applied.phase === 'aim' && !applied.ballInHand) {
    const cont =
      typeof applied.continueTurnSeat === 'number'
        ? applied.continueTurnSeat
        : Number(applied.continueTurnSeat);
    if (cont === 1 || cont === 2) {
      return cont as 1 | 2;
    }
    const inferred = inferOnClockFromLastShotSummary(applied, moverSeat);
    if (inferred != null) {
      return inferred;
    }
    const last = applied.turnHistory.at(-1);
    if (
      last?.seat === moverSeat &&
      /pocketed/i.test(last.summary) &&
      !/ball in hand|wrong ball|did not hit|eight ball first/i.test(last.summary)
    ) {
      return moverSeat;
    }
  }
  if (applied.ballInHand && applied.ballInHandSeat != null) {
    return applied.ballInHandSeat;
  }
  return moverSeat === 1 ? 2 : 1;
}

function billiardsFrameWagerLabel(state: BilliardsMatchState): string {
  return state.rulesProfile === 'nine-ball' ? '9-ball' : '8-ball';
}

export const billiardsEightBallAdapter: GameServerAdapter = {
  ...billiardsAdapterCore,
  gameId: BILLIARDS_GAME_IDS.EIGHT_BALL,

  resolveAiMatchWagerQuarks: resolveCatalogAiMatchWagerQuarks,

  resolveHumanMatchWagerQuarks: resolveCatalogPvpWagerQuarks,

  virtualBankSettlements(state, ctx) {
    const s = normalizeState(state);
    return catalogHeadToHeadWagerSettlementLines(
      s,
      ctx,
      billiardsFrameWagerLabel(s),
      () => s.phase === 'finished',
      () => s.winnerSeat,
    );
  },

  validateMove(state, move, playerSeat) {
    const base = billiardsAdapterCore.validateMove(state, move, playerSeat);
    if (!base.ok) {
      return base;
    }
    const type = moveType(move);
    if (type?.startsWith('layout/')) {
      const s = normalizeState(state);
      if (s.layoutLocked) {
        return { ok: false, error: 'Layout is locked' };
      }
    }
    return base;
  },

  nextSeatAfterMove(_state, move, moverSeat, appliedState) {
    const applied = normalizeState(appliedState);
    const type = moveType(move);
    if (type === 'shot') {
      return nextSeatAfterCompetitiveShot(applied, moverSeat);
    }
    if (type === 'cue/place') {
      return moverSeat;
    }
    return moverSeat;
  },

  async agentMoveAsync(
    state,
    difficulty: GameDifficulty,
    playerSeat: number,
    deps: PlatformAgentTurnDeps,
  ) {
    const typed = normalizeState(state);
    if (typed.phase === 'place_cue' && typed.ballInHandSeat === playerSeat) {
      return runAgentMoveLoop<BilliardsMatchState, Record<string, unknown>>(
        typed,
        difficulty,
        playerSeat,
        deps,
        {
          purpose: BILLIARDS_AGENT_PURPOSE,
          structuralToolId: BILLIARDS_PLACE_CUE_TOOL_ID,
          systemPrompt: buildPlacementSystemPrompt(difficulty),
          temperatureFor: (tier) => agentTemperature(tier as GameDifficulty),
          buildUserPrompt: (ctx) =>
            buildPlacementUserPrompt(
              ctx.state,
              ctx.playerSeat,
              ctx.difficulty as GameDifficulty,
              ctx.lastRejection ? { lastRejection: ctx.lastRejection } : undefined,
            ),
          parseMove: (raw, s, seat) => gradeAgentPlaceCue(raw, s, seat),
          retryUserHint: (ctx) => placementRetryUserHint(ctx.lastRejection ?? 'Illegal placement'),
          attemptNote,
          reasoningEffort: 'none' as PlatformLlmReasoningEffort,
          sampling: DEFAULT_AGENT_LLM_SAMPLING,
          toolResultHint: placementToolResultHint,
          limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
        },
      );
    }
    return runAgentMoveLoop<BilliardsMatchState, Record<string, unknown>>(
      typed,
      difficulty,
      playerSeat,
      deps,
      {
        purpose: BILLIARDS_AGENT_PURPOSE,
        structuralToolId: BILLIARDS_SUBMIT_SHOT_TOOL_ID,
        systemPrompt: buildSystemPrompt(difficulty),
        temperatureFor: (tier) => agentTemperature(tier as GameDifficulty),
        buildUserPrompt: (ctx) =>
          buildUserPrompt(
            ctx.state,
            ctx.playerSeat,
            ctx.difficulty as GameDifficulty,
            ctx.lastRejection ? { lastRejection: ctx.lastRejection } : undefined,
          ),
        parseMove: (raw, s, seat) => gradeAgentShot(raw, s, seat, difficulty),
        retryUserHint: (ctx) => retryUserHint(ctx.lastRejection ?? 'Illegal shot'),
        attemptNote,
        reasoningEffort: 'none' as PlatformLlmReasoningEffort,
        sampling: DEFAULT_AGENT_LLM_SAMPLING,
        toolResultHint,
        limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
      },
    );
  },
};
