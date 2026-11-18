import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  BILLIARDS_SUBMIT_SHOT_TOOL_ID,
  BilliardsAgentShotSchema,
  type BilliardsAgentShot,
} from '../shared/billiards-agent-move-schema';
import {
  BILLIARDS_PLACE_CUE_TOOL_ID,
  BilliardsAgentPlaceSchema,
  type BilliardsAgentPlace,
} from '../shared/billiards-agent-place-schema';
import { canPlaceBallAt } from '../shared/billiards-layout';
import { BALL_RADIUS, HEAD_STRING_Y, TABLE_HEIGHT, TABLE_WIDTH } from '../shared/billiards-types';
import {
  BILLIARDS_AGENT_STRATEGY_BY_TIER,
  BILLIARDS_STRATEGY_CORE,
  BILLIARDS_USER_TURN_CHECKLIST,
} from '../shared/billiards-agent-strategy';
import type { BilliardsMatchState } from '../shared/billiards-types';
import {
  formatAgentPlacementHints,
  formatAgentShotAimHints,
  formatAgentShotRejectionHint,
  shotAngleAimsAtLegalObject,
} from '../shared/billiards-agent-aim-hints';
import { billiardsDifficultyExecutionNote } from '../shared/billiards-agent-difficulty';
import { applyBilliardsAgentShotTierPolicy } from '../shared/billiards-agent-shot-policy';
import {
  countGroupRemaining,
  groupForSeat,
  lowestLiveBallNumber,
  normalizeBilliardsSeatGroups,
  tableIsOpen,
} from '../shared/billiards-rules';

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Use RECOMMENDED POCKET SHOT when present; approximate angle is fine on cuts; modest power unless the hint says otherwise.',
  medium: 'Read **EASY MAKE / MAKABLE** summary — submit the pocket aimDeg **you** choose from hints (ghost-ball angle on cuts).',
  hard: 'You must select RECOMMENDED or a listed alternate yourself — copy angleDeg/power when pocketing EASY MAKE / MAKABLE lines.',
  boss: 'You choose every shot: pocket EASY MAKE / MAKABLE when you pick those lines (exact aimDeg/power); clear your group before the 8; otherwise play a legal safe.',
};

const AGENT_ROLE =
  'You are playing pool on a 1000×500 table (follow the rules profile in the user message).';
const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call \`${BILLIARDS_SUBMIT_SHOT_TOOL_ID}\` exactly once with angleDeg, power, and optional english.
- Put the shot ONLY in the tool arguments — never in assistant text.
- You must be in aim phase with the cue ball on the table to shoot.
- If a previous attempt was rejected, follow the rejection note — do not repeat it.
- Read **AIM HINTS** each turn — pick a listed line and copy **pocket aimDeg** + power into the tool (ghost-ball angle; on cuts, never submit center-hit toward the object).
- Read **PATH OBSTRUCTIONS** when present — a correct-looking angle still fails if another ball is first on the cue path or blocks the object roll to the pocket.
- Reasoning/thinking is off — call the tool directly without extended analysis in the assistant message.`;

const PLACE_TOOL_CONTRACT = `OUTPUT CONTRACT (ball in hand — place cue ball):
- Call \`${BILLIARDS_PLACE_CUE_TOOL_ID}\` exactly once with x and y (table coordinates).
- Put placement ONLY in the tool arguments — never in assistant text.
- Pick open felt — do not overlap other balls. Honor the placement zone in the user message.
- Read **PLACEMENT HINTS** — choose coordinates that match the current ball layout (never paste the same x,y every foul).
- Reasoning/thinking is off — call the tool directly without extended analysis in the assistant message.`;

const MAX_TURN_HISTORY_LINES = 8;

function formatBallLine(state: BilliardsMatchState): string {
  const live = state.balls.filter((b) => !b.pocketed);
  const parts = live
    .sort((a, b) => a.number - b.number)
    .map((b) => `#${b.number}@(${b.x.toFixed(0)},${b.y.toFixed(0)})`);
  return parts.length > 0 ? parts.join('  ') : '(no balls)';
}

function countLiveByGroup(state: BilliardsMatchState): { solids: number; stripes: number; eight: boolean } {
  const live = state.balls.filter((b) => !b.pocketed && b.number !== 0);
  return {
    solids: countGroupRemaining(state.balls, 'solids'),
    stripes: countGroupRemaining(state.balls, 'stripes'),
    eight: live.some((b) => b.number === 8),
  };
}

function formatTurnHistory(state: BilliardsMatchState, seat: number): string[] {
  const entries = state.turnHistory.slice(-MAX_TURN_HISTORY_LINES);
  if (entries.length === 0) {
    return ['(no shots recorded yet)'];
  }
  return entries.map((e, i) => {
    const who = e.seat === seat ? 'you' : `seat ${e.seat}`;
    return `${i + 1}. ${who}: ${e.summary}`;
  });
}

export function buildPlacementSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${PLACE_TOOL_CONTRACT}\n\n${BILLIARDS_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: BILLIARDS_AGENT_STRATEGY_BY_TIER,
    gameMechanicsForAllTiers: Object.entries(TIER_TIPS)
      .map(([tier, tip]) => `${tier}: ${tip}`)
      .join('\n'),
  });
}

export function buildSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${BILLIARDS_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: BILLIARDS_AGENT_STRATEGY_BY_TIER,
    gameMechanicsForAllTiers: Object.entries(TIER_TIPS)
      .map(([tier, tip]) => `${tier}: ${tip}`)
      .join('\n'),
  });
}

export function buildUserPrompt(
  state: BilliardsMatchState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed);
  const seatGroups = normalizeBilliardsSeatGroups(state);
  const myGroup = groupForSeat(seatGroups, seat);
  const groupLine =
    state.rulesProfile === 'eight-ball'
      ? tableIsOpen(seatGroups)
        ? 'Table open — pocket balls of one group only on a legal shot to claim solids or stripes (not both on the same shot).'
        : myGroup != null
          ? `Your group: ${myGroup}. Opponent: ${myGroup === 'solids' ? 'stripes' : 'solids'}.`
          : 'Group not assigned for your seat yet.'
      : state.rulesProfile === 'nine-ball'
        ? `Nine-ball: cue ball must contact the lowest object ball on the table (balls 1–9) first. Lowest live ball: ${lowestLiveBallNumber(state.balls) ?? 'none'}.`
        : 'Open practice — no competitive win rules.';
  const counts = countLiveByGroup(state);
  const executionNote = billiardsDifficultyExecutionNote(difficulty);
  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    ...(executionNote ? ['', executionNote] : []),
    '',
    `You are seat ${seat}. Rules: ${state.rulesProfile}. Phase: ${state.phase}. Shots taken: ${state.shotsTaken}.`,
    state.ballInHand && state.ballInHandSeat !== seat
      ? `Opponent has ball in hand (${state.placementZone}) — wait until aim phase.`
      : state.ballInHand
        ? `You have ball in hand (${state.placementZone}) — not relevant while shooting.`
        : 'Ball in hand: no.',
    groupLine,
    state.rulesProfile === 'eight-ball'
      ? `On table: ${counts.solids} solids, ${counts.stripes} stripes${counts.eight ? ', 8-ball' : ', 8-ball pocketed'}.`
      : '',
    '',
    'Turn history (recent shots — trust for fouls and pockets):',
    ...formatTurnHistory(state, seat),
    '',
    'Table size: width 1000, height 500. Origin top-left; x increases right, y increases down.',
    cue ? `Cue ball at (${cue.x.toFixed(1)}, ${cue.y.toFixed(1)}).` : 'Cue ball not on table (cannot shoot).',
    'Balls on table:',
    formatBallLine(state),
    '',
    ...formatAgentShotAimHints(state, seat, difficulty),
    '',
    'Submit one shot with angleDeg (0° = right), power 0.12–1.0.',
  ].filter(Boolean);

  const checklist = BILLIARDS_USER_TURN_CHECKLIST[difficulty];
  if (checklist) {
    lines.push('', checklist);
  }

  if (options?.lastRejection) {
    lines.push('', `Previous attempt rejected: ${options.lastRejection}`);
  }
  return lines.join('\n');
}

export function buildPlacementUserPrompt(
  state: BilliardsMatchState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const seatGroups = normalizeBilliardsSeatGroups(state);
  const myGroup = groupForSeat(seatGroups, seat);
  const zone = state.placementZone;
  const kitchenLine = `Kitchen restriction: y must be ≤ ${(HEAD_STRING_Y - BALL_RADIUS).toFixed(0)} (head string at y=${HEAD_STRING_Y.toFixed(0)}).`;
  const zoneLine =
    zone === 'kitchen'
      ? `Placement zone: **kitchen** (top quarter only). ${kitchenLine}`
      : 'Placement zone: **full table** — any open spot on the felt.';
  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are seat ${seat}. Rules: ${state.rulesProfile}. Phase: place_cue (ball in hand).`,
    zoneLine,
    state.rulesProfile === 'eight-ball' && myGroup != null ? `Your group: ${myGroup}.` : '',
    '',
    'Turn history (recent — fouls and scratches matter for why you have ball in hand):',
    ...formatTurnHistory(state, seat),
    '',
    `Table size: width ${TABLE_WIDTH}, height ${TABLE_HEIGHT}. Origin top-left; x increases right, y increases down.`,
    'Object balls on table (cue ball is off-table until you place it):',
    formatBallLine(state),
    '',
    ...formatAgentPlacementHints(state, seat),
    '',
    `Call ${BILLIARDS_PLACE_CUE_TOOL_ID} with x and y where the cue ball should sit.`,
    'Pick a spot that improves your next shot — open lanes toward your balls and away from scratches.',
  ].filter(Boolean);

  if (options?.lastRejection) {
    lines.push('', `Previous attempt rejected: ${options.lastRejection}`);
  }
  return lines.join('\n');
}

function shotFromAgent(raw: BilliardsAgentShot): Record<string, unknown> {
  const angleRad = (raw.angleDeg * Math.PI) / 180;
  return {
    type: 'shot',
    angleRad,
    power: raw.power,
    englishX: raw.englishX ?? 0,
    englishY: raw.englishY ?? 0,
  };
}

export function gradeAgentShot(
  raw: unknown,
  state: BilliardsMatchState,
  seat: number,
  difficulty: GameDifficulty = 'medium',
): Record<string, unknown> {
  const parsed = BilliardsAgentShotSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? 'Invalid shot arguments.');
  }
  const tuned = applyBilliardsAgentShotTierPolicy(parsed.data, state, seat, difficulty);
  if (state.phase !== 'aim' || !state.layoutLocked) {
    throw new Error('Not ready to shoot — wait until aim phase.');
  }
  if (!state.balls.some((b) => b.number === 0 && !b.pocketed)) {
    throw new Error('Cue ball must be on the table before shooting.');
  }
  if (!shotAngleAimsAtLegalObject(state, seat, tuned.angleDeg)) {
    const hint = formatAgentShotRejectionHint(state, seat, tuned.angleDeg, difficulty);
    throw new Error(
      `angleDeg ${tuned.angleDeg.toFixed(1)} does not first-contact a legal object ball. ${hint}`,
    );
  }
  return shotFromAgent(tuned);
}

function placeFromAgent(raw: BilliardsAgentPlace): Record<string, unknown> {
  return { type: 'cue/place', x: raw.x, y: raw.y };
}

export function gradeAgentPlaceCue(
  raw: unknown,
  state: BilliardsMatchState,
  seat: number,
): Record<string, unknown> {
  const parsed = BilliardsAgentPlaceSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message ?? 'Invalid placement arguments.');
  }
  if (state.phase !== 'place_cue' || !state.ballInHand) {
    throw new Error('Not ball in hand — cannot place cue ball.');
  }
  if (state.ballInHandSeat !== seat) {
    throw new Error('Ball in hand belongs to another seat.');
  }
  const { x, y } = parsed.data;
  if (!canPlaceBallAt(state.balls, x, y, 'cue', state.placementZone)) {
    throw new Error(
      state.placementZone === 'kitchen'
        ? 'Illegal kitchen placement — stay above the head string and clear of other balls.'
        : 'Illegal placement — that spot overlaps a ball or cushion.',
    );
  }
  return placeFromAgent(parsed.data);
}

export function placementRetryUserHint(lastRejection: string): string {
  return `Your last placement was rejected: ${lastRejection}. Call ${BILLIARDS_PLACE_CUE_TOOL_ID} with legal x and y.`;
}

export function placementToolResultHint(): string {
  return 'Cue ball placed.';
}

export function toolResultHint(): string {
  return 'Shot applied.';
}

export function retryUserHint(lastRejection: string): string {
  return `Your last shot was rejected: ${lastRejection}. Call ${BILLIARDS_SUBMIT_SHOT_TOOL_ID} with a legal shot.`;
}

export function attemptNote(note: string): string {
  return note;
}

export const BILLIARDS_AGENT_PURPOSE = 'billiards.billiards.agent-turn';

export function parseAgentReply(
  content: string,
  state: BilliardsMatchState,
  seat: number,
): Record<string, unknown> | null {
  const degMatch = content.match(/angle\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  const powMatch = content.match(/power\s*[:=]?\s*(0?\.\d+|1(?:\.0+)?)/i);
  if (!degMatch || !powMatch) {
    return null;
  }
  const raw: BilliardsAgentShot = {
    angleDeg: Number(degMatch[1]),
    power: Number(powMatch[1]),
  };
  try {
    return gradeAgentShot(raw, state, seat);
  } catch {
    return null;
  }
}
