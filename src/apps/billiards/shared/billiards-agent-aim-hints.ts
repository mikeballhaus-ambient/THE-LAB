import { findFirstContactObjectBall, objectBallPocketPathBlocker } from './billiard-shot-hint-paths';
import { canPlaceBallAt } from './billiards-layout';
import {
  countGroupRemaining,
  groupForBall,
  groupForSeat,
  lowestLiveBallNumber,
  normalizeBilliardsSeatGroups,
  tableIsOpen,
} from './billiards-rules';
import type { GameDifficulty } from '@/shared/game-platform/types';
import type { BilliardsBall, BilliardsMatchState, BilliardsPlacementZone } from './billiards-types';
import {
  BALL_RADIUS,
  HEAD_STRING_Y,
  TABLE_HEIGHT,
  TABLE_POCKET_CENTERS,
  TABLE_WIDTH,
} from './billiards-types';

/** Game convention: 0° = +x (right), 90° = +y (down). */
export function tableAimDegreesFromTo(fromX: number, fromY: number, toX: number, toY: number): number {
  const rad = Math.atan2(toY - fromY, toX - fromX);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) {
    deg += 360;
  }
  return deg;
}

export function angularDistanceDegrees(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) {
    d = 360 - d;
  }
  return d;
}

export function legalObjectBallsForSeat(state: BilliardsMatchState, seat: number): BilliardsBall[] {
  const live = state.balls.filter((b) => !b.pocketed && b.number > 0);
  if (state.rulesProfile === 'nine-ball') {
    const low = lowestLiveBallNumber(state.balls);
    if (low == null) {
      return live.filter((b) => b.number === 9);
    }
    return live.filter((b) => b.number === low || b.number === 9);
  }
  if (state.rulesProfile === 'eight-ball') {
    const seatGroups = normalizeBilliardsSeatGroups(state);
    const myGroup = groupForSeat(seatGroups, seat);
    if (tableIsOpen(seatGroups)) {
      return live;
    }
    if (myGroup == null) {
      return live;
    }
    const groupBalls = live.filter((b) => groupForBall(b.number) === myGroup);
    const eightLive = live.some((b) => b.number === 8);
    const myRemaining = countGroupRemaining(state.balls, myGroup);
    if (myRemaining === 0 && eightLive) {
      return [...groupBalls, ...live.filter((b) => b.number === 8)];
    }
    return groupBalls;
  }
  return live;
}

function pocketLabel(ix: number): string {
  const labels = ['top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-middle', 'bottom-right'];
  return labels[ix] ?? `pocket-${ix}`;
}

/** Ghost-ball contact point so a center hit sends the object toward the pocket. */
function ghostBallAimPoint(
  obj: Pick<BilliardsBall, 'x' | 'y'>,
  pocket: { x: number; y: number },
): { x: number; y: number } {
  const dx = pocket.x - obj.x;
  const dy = pocket.y - obj.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const spacing = BALL_RADIUS * 2.02;
  return {
    x: obj.x - ux * spacing,
    y: obj.y - uy * spacing,
  };
}

export interface AgentPocketShotHint {
  ballNumber: number;
  pocketIndex: number;
  pocketLabel: string;
  /** angleDeg to submit — cue toward ghost ball (pockets on center hit). */
  pocketAimDeg: number;
  centerHitDeg: number;
  straightIn: boolean;
  suggestedPower: number;
  score: number;
  cueToGhost: number;
  objectToPocket: number;
  /** False when another ball sits between object and pocket on the roll line. */
  objectPathClear: boolean;
  objectPathBlocker: number | null;
}

const STRAIGHT_IN_DEG = 8;

/** Straight-in and short — agents on hard/boss should not miss these. */
export function isAgentEasyPocketHint(h: AgentPocketShotHint): boolean {
  if (h.objectToPocket < 130 && h.cueToGhost < 320 && h.objectPathClear) {
    return true;
  }
  return h.straightIn && h.objectToPocket < 300 && h.cueToGhost < 420;
}

/** Short clear pocket lines (straight or modest cut) — strong LLM targets when the model picks the line. */
export function isAgentMakablePocketHint(h: AgentPocketShotHint): boolean {
  if (isAgentEasyPocketHint(h)) {
    return true;
  }
  const cutDeg = pocketCutDegrees(h);
  if (h.straightIn && h.objectToPocket < 340 && h.cueToGhost < 480) {
    return true;
  }
  return cutDeg < 30 && h.objectToPocket < 320 && h.cueToGhost < 460;
}

export function pocketCutDegrees(h: AgentPocketShotHint): number {
  return angularDistanceDegrees(h.pocketAimDeg, h.centerHitDeg);
}

function suggestPowerForPocketShot(cueToGhost: number, objectToPocket: number, straightIn: boolean): number {
  const travel = cueToGhost + objectToPocket;
  let raw = travel / 820;
  if (straightIn && objectToPocket < 200) {
    raw = Math.max(raw, 0.38);
  }
  return Math.min(0.95, Math.max(0.26, raw));
}

function collapseRankedByBall(
  hints: AgentPocketShotHint[],
  maxPocketsPerBall: number,
): AgentPocketShotHint[] {
  const byBall = new Map<number, AgentPocketShotHint[]>();
  for (const h of hints) {
    const list = byBall.get(h.ballNumber) ?? [];
    if (list.length < maxPocketsPerBall) {
      list.push(h);
      byBall.set(h.ballNumber, list);
    }
  }
  return [...byBall.values()].flat().sort((a, b) => a.score - b.score);
}

export function rankAgentPocketShots(
  state: BilliardsMatchState,
  seat: number,
  options?: { maxPocketsPerBall?: number },
): AgentPocketShotHint[] {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed);
  if (!cue) {
    return [];
  }
  const targets = legalObjectBallsForSeat(state, seat);
  const hints: AgentPocketShotHint[] = [];

  for (const ball of targets) {
    for (let i = 0; i < TABLE_POCKET_CENTERS.length; i += 1) {
      const pocket = TABLE_POCKET_CENTERS[i]!;
      const ghost = ghostBallAimPoint(ball, pocket);
      const pocketAimDeg = tableAimDegreesFromTo(cue.x, cue.y, ghost.x, ghost.y);
      const centerHitDeg = tableAimDegreesFromTo(cue.x, cue.y, ball.x, ball.y);
      const straightIn = angularDistanceDegrees(pocketAimDeg, centerHitDeg) < STRAIGHT_IN_DEG;
      const objectToPocket = Math.hypot(pocket.x - ball.x, pocket.y - ball.y);
      const cueToGhost = Math.hypot(ghost.x - cue.x, ghost.y - cue.y);
      const aimRad = (pocketAimDeg * Math.PI) / 180;
      const firstContact = findFirstContactObjectBall(cue, aimRad, state.balls);
      if (!firstContact || firstContact.number !== ball.number) {
        continue;
      }
      const objectPathBlocker = objectBallPocketPathBlocker(ball, pocket, state.balls);
      if (objectPathBlocker != null) {
        continue;
      }
      const cutPenalty = straightIn ? 0 : angularDistanceDegrees(pocketAimDeg, centerHitDeg) * 5;
      const easyBonus =
        (straightIn && objectToPocket < 180 ? 140 : 0) +
        (objectToPocket < 120 ? 80 : 0);
      hints.push({
        ballNumber: ball.number,
        pocketIndex: i,
        pocketLabel: pocketLabel(i),
        pocketAimDeg,
        centerHitDeg,
        straightIn,
        suggestedPower: suggestPowerForPocketShot(cueToGhost, objectToPocket, straightIn),
        score: objectToPocket + cueToGhost * 0.65 + cutPenalty - easyBonus,
        cueToGhost,
        objectToPocket,
        objectPathClear: true,
        objectPathBlocker: null,
      });
    }
  }

  hints.sort((a, b) => a.score - b.score);
  const perBall = Math.max(1, options?.maxPocketsPerBall ?? 1);
  return collapseRankedByBall(hints, perBall);
}

function hintListLimit(difficulty: GameDifficulty | undefined): number {
  switch (difficulty) {
    case 'boss':
      return 14;
    case 'hard':
      return 10;
    case 'medium':
      return 8;
    default:
      return 6;
  }
}

function pocketsPerBallForHints(difficulty: GameDifficulty | undefined): number {
  return difficulty === 'boss' || difficulty === 'hard' ? 2 : 1;
}

function formatHintAngleDeg(deg: number, difficulty: GameDifficulty | undefined): string {
  return difficulty === 'boss' || difficulty === 'hard' ? deg.toFixed(1) : deg.toFixed(0);
}

function formatHintLine(h: AgentPocketShotHint, difficulty: GameDifficulty | undefined): string {
  const tag = isAgentEasyPocketHint(h) ? ' EASY MAKE' : isAgentMakablePocketHint(h) ? ' MAKABLE' : '';
  const cut = pocketCutDegrees(h);
  const cutNote =
    cut >= 5
      ? `; cut ${cut.toFixed(0)}° — submit pocket aimDeg (not center-hit ${formatHintAngleDeg(h.centerHitDeg, difficulty)}°)`
      : '; straight-in (pocket aimDeg ≈ center-hit)';
  return (
    `  • #${h.ballNumber} → ${h.pocketLabel}: pocket aimDeg=${formatHintAngleDeg(h.pocketAimDeg, difficulty)}°` +
    `, center-hit=${formatHintAngleDeg(h.centerHitDeg, difficulty)}°, power=${h.suggestedPower.toFixed(2)}` +
    `; object roll CLEAR${cutNote}${tag}`
  );
}

function formatLegalObjectTargets(state: BilliardsMatchState, seat: number): string {
  const targets = legalObjectBallsForSeat(state, seat)
    .map((b) => `#${b.number}`)
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  return targets.length > 0
    ? `Legal first-contact object balls this shot: ${targets.join(', ')}.`
    : 'Legal first-contact object balls: (none — check rules).';
}

function formatSuggestedToolCall(h: AgentPocketShotHint, difficulty: GameDifficulty | undefined): string | null {
  if (difficulty !== 'boss' && difficulty !== 'hard') {
    return null;
  }
  return (
    `Suggested tool args if you take RECOMMENDED: angleDeg=${formatHintAngleDeg(h.pocketAimDeg, difficulty)}, ` +
    `power=${h.suggestedPower.toFixed(2)}, englishX=0, englishY=0.`
  );
}

/** Nearest listed pocket line — for rejection / retry copy (does not change the submitted shot). */
export function formatAgentShotRejectionHint(
  state: BilliardsMatchState,
  seat: number,
  submittedAngleDeg: number,
  difficulty?: GameDifficulty,
): string {
  const ranked = rankAgentPocketShots(state, seat, { maxPocketsPerBall: 2 });
  if (ranked.length === 0) {
    return 'No unobstructed pocket lines — aim center-hit at a legal object or play safe.';
  }
  let nearest = ranked[0]!;
  let nearestErr = angularDistanceDegrees(submittedAngleDeg, nearest.pocketAimDeg);
  for (const h of ranked) {
    const err = Math.min(
      angularDistanceDegrees(submittedAngleDeg, h.pocketAimDeg),
      angularDistanceDegrees(submittedAngleDeg, h.centerHitDeg),
    );
    if (err < nearestErr) {
      nearestErr = err;
      nearest = h;
    }
  }
  return (
    `Off by ${nearestErr.toFixed(1)}° from #${nearest.ballNumber} → ${nearest.pocketLabel}: ` +
    `use pocket aimDeg=${formatHintAngleDeg(nearest.pocketAimDeg, difficulty)}° (not center-hit ` +
    `${formatHintAngleDeg(nearest.centerHitDeg, difficulty)}° on this cut).`
  );
}

/** Whether angleDeg sends the cue ball into a legal object (first contact along the aim ray). */
export function shotAngleHitsLegalObject(
  state: BilliardsMatchState,
  seat: number,
  angleDeg: number,
): boolean {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed);
  if (!cue) {
    return true;
  }
  const targets = legalObjectBallsForSeat(state, seat);
  if (targets.length === 0) {
    return true;
  }
  const legalNums = new Set(targets.map((b) => b.number));
  const rad = (angleDeg * Math.PI) / 180;
  const first = findFirstContactObjectBall(cue, rad, state.balls);
  if (!first) {
    return false;
  }
  return legalNums.has(first.number);
}

const MAX_OBSTRUCTION_HINTS = 8;

function formatAgentPathObstructionHints(state: BilliardsMatchState, seat: number): string[] {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed);
  if (!cue) {
    return [];
  }
  const targets = legalObjectBallsForSeat(state, seat);
  const lines: string[] = [];

  for (const ball of targets) {
    const centerHitDeg = tableAimDegreesFromTo(cue.x, cue.y, ball.x, ball.y);
    const centerRad = (centerHitDeg * Math.PI) / 180;
    const cueFirst = findFirstContactObjectBall(cue, centerRad, state.balls);
    if (cueFirst && cueFirst.number !== ball.number) {
      lines.push(
        `Cue center-line toward #${ball.number} (≈${centerHitDeg.toFixed(0)}°) hits **#${cueFirst.number} first** — use a listed pocket aimDeg or another ball.`,
      );
    }
    for (let i = 0; i < TABLE_POCKET_CENTERS.length; i += 1) {
      const pocket = TABLE_POCKET_CENTERS[i]!;
      const blocker = objectBallPocketPathBlocker(ball, pocket, state.balls);
      if (blocker == null) {
        continue;
      }
      lines.push(
        `After hitting #${ball.number}, roll to ${pocketLabel(i)} is blocked by **#${blocker}** — not a straight pocket line.`,
      );
    }
  }

  if (lines.length === 0) {
    return [];
  }
  const uniq = [...new Set(lines)];
  return [
    'PATH OBSTRUCTIONS — other balls in the way (do not aim as if the path is clear):',
    ...uniq.slice(0, MAX_OBSTRUCTION_HINTS),
    ...(uniq.length > MAX_OBSTRUCTION_HINTS
      ? [`  • (${uniq.length - MAX_OBSTRUCTION_HINTS} more — trust first-contact and object-roll blockers above.)`]
      : []),
  ];
}

export function formatAgentShotAimHints(
  state: BilliardsMatchState,
  seat: number,
  difficulty?: GameDifficulty,
): string[] {
  const cue = state.balls.find((b) => b.number === 0 && !b.pocketed);
  if (!cue) {
    return ['(no cue on table — cannot compute aim)'];
  }
  const ranked = rankAgentPocketShots(state, seat, {
    maxPocketsPerBall: pocketsPerBallForHints(difficulty),
  });
  if (ranked.length === 0) {
    const obstruction = formatAgentPathObstructionHints(state, seat);
    if (obstruction.length > 0) {
      return ['(no unobstructed pocket lines on this layout)', '', ...obstruction];
    }
    return ['(no legal object balls)'];
  }
  const limit = hintListLimit(difficulty);
  const top = ranked.slice(0, limit);
  const best = ranked[0]!;
  const makableCount = ranked.filter(isAgentMakablePocketHint).length;
  const easyCount = ranked.filter(isAgentEasyPocketHint).length;
  const easyLines = ranked.filter(isAgentEasyPocketHint);
  const easyTag = isAgentEasyPocketHint(best)
    ? ' **EASY MAKE** — if you choose this line, submit pocket aimDeg and power below.'
    : isAgentMakablePocketHint(best)
      ? ' **MAKABLE** — use pocket aimDeg from this line.'
      : '';
  const tierSummary =
    easyCount > 0 || makableCount > 0
      ? `Clear pocket lines this turn: ${easyCount} EASY MAKE, ${makableCount} MAKABLE (listed below).`
      : 'No EASY MAKE this turn — pick the best listed line or play safe.';
  const obstruction = formatAgentPathObstructionHints(state, seat);
  const lines: string[] = [
    'AIM HINTS — you choose the shot; copy numbers from a bullet into the tool.',
    'On **cuts**, pocket aimDeg ≠ center-hit toward the object — submitting center-hit misses.',
    'Listed lines require clear cue path to the object AND clear object roll to the pocket.',
    formatLegalObjectTargets(state, seat),
    `Cue at (${cue.x.toFixed(1)}, ${cue.y.toFixed(1)}). 0°=right, 90°=down.`,
    tierSummary,
    `RECOMMENDED POCKET SHOT: #${best.ballNumber} → ${best.pocketLabel} — pocket aimDeg=${formatHintAngleDeg(
      best.pocketAimDeg,
      difficulty,
    )}°, power=${best.suggestedPower.toFixed(2)}${
      best.straightIn ? ' (straight-in)' : ` (cut ${pocketCutDegrees(best).toFixed(0)}°)`
    }${easyTag}`,
  ];
  const toolCall = formatSuggestedToolCall(best, difficulty);
  if (toolCall) {
    lines.push(toolCall);
  }
  if ((difficulty === 'boss' || difficulty === 'hard') && easyLines.length > 0) {
    lines.push('', 'EASY MAKE lines (all — pick one if you run a ball):');
    for (const h of easyLines.slice(0, 8)) {
      lines.push(formatHintLine(h, difficulty));
    }
    if (easyLines.length > 8) {
      lines.push(`  • (${easyLines.length - 8} more EASY MAKE lines in the ranked list.)`);
    }
  }
  lines.push('', 'Ranked clear pocket shots:');
  for (const h of top) {
    lines.push(formatHintLine(h, difficulty));
  }
  if (ranked.length > top.length) {
    lines.push(`  • (${ranked.length - top.length} more clear pocket lines not shown.)`);
  }
  if (obstruction.length > 0) {
    lines.push('', ...obstruction);
  }
  return lines;
}

interface PlacementCandidate {
  x: number;
  y: number;
  score: number;
  note: string;
}

function dedupeCandidates(candidates: PlacementCandidate[], minDist: number): PlacementCandidate[] {
  const kept: PlacementCandidate[] = [];
  for (const c of candidates) {
    if (kept.some((k) => Math.hypot(k.x - c.x, k.y - c.y) < minDist)) {
      continue;
    }
    kept.push(c);
  }
  return kept;
}

export function suggestAgentPlacementCandidates(
  state: BilliardsMatchState,
  seat: number,
  zone: BilliardsPlacementZone,
): PlacementCandidate[] {
  const objectBalls = legalObjectBallsForSeat(state, seat);
  const candidates: PlacementCandidate[] = [];

  const margin = BALL_RADIUS * 3;
  const maxY =
    zone === 'kitchen' ? HEAD_STRING_Y - BALL_RADIUS : TABLE_HEIGHT - margin;
  const minY = margin;

  for (const obj of objectBalls) {
    for (let i = 0; i < TABLE_POCKET_CENTERS.length; i += 1) {
      const pocket = TABLE_POCKET_CENTERS[i]!;
      const dx = pocket.x - obj.x;
      const dy = pocket.y - obj.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const ghostX = obj.x - ux * BALL_RADIUS * 2.15;
      const ghostY = obj.y - uy * BALL_RADIUS * 2.15;
      if (
        ghostY >= minY &&
        ghostY <= maxY &&
        ghostX >= margin &&
        ghostX <= TABLE_WIDTH - margin &&
        canPlaceBallAt(state.balls, ghostX, ghostY, 'cue', zone)
      ) {
        candidates.push({
          x: ghostX,
          y: ghostY,
          score: len,
          note: `lines up #${obj.number} → ${pocketLabel(i)}`,
        });
      }
    }
    const towardCenterX = TABLE_WIDTH / 2;
    const towardCenterY = TABLE_HEIGHT / 2;
    const ddx = towardCenterX - obj.x;
    const ddy = towardCenterY - obj.y;
    const dlen = Math.hypot(ddx, ddy) || 1;
    const behindX = obj.x - (ddx / dlen) * BALL_RADIUS * 3.2;
    const behindY = obj.y - (ddy / dlen) * BALL_RADIUS * 3.2;
    if (
      behindY >= minY &&
      behindY <= maxY &&
      behindX >= margin &&
      behindX <= TABLE_WIDTH - margin &&
      canPlaceBallAt(state.balls, behindX, behindY, 'cue', zone)
    ) {
      candidates.push({
        x: behindX,
        y: behindY,
        score: 800 + dlen,
        note: `approach #${obj.number} from center`,
      });
    }
  }

  for (let gy = minY; gy <= maxY; gy += 48) {
    for (let gx = margin; gx <= TABLE_WIDTH - margin; gx += 56) {
      if (!canPlaceBallAt(state.balls, gx, gy, 'cue', zone)) {
        continue;
      }
      let best = Infinity;
      let bestNum = 0;
      for (const obj of objectBalls) {
        const d = Math.hypot(obj.x - gx, obj.y - gy);
        if (d < best) {
          best = d;
          bestNum = obj.number;
        }
      }
      candidates.push({
        x: gx,
        y: gy,
        score: best + 2000,
        note: bestNum ? `open lane near #${bestNum}` : 'open felt',
      });
    }
  }

  return dedupeCandidates(
    candidates.sort((a, b) => a.score - b.score),
    BALL_RADIUS * 2.8,
  ).slice(0, 5);
}

export function formatAgentPlacementHints(state: BilliardsMatchState, seat: number): string[] {
  const zone = state.placementZone;
  const picks = suggestAgentPlacementCandidates(state, seat, zone);
  if (picks.length === 0) {
    return [
      'PLACEMENT HINTS: scan open felt in the legal zone — vary x and y based on where object balls sit (do not reuse the same coordinates every foul).',
    ];
  }
  return [
    'PLACEMENT HINTS (ball in hand — pick one open coordinate or a nearby variant; do NOT copy the same x,y every turn):',
    ...picks.map(
      (p, i) =>
        `  ${i + 1}. x=${p.x.toFixed(0)}, y=${p.y.toFixed(0)} — ${p.note}`,
    ),
  ];
}

export function shotAngleAimsAtLegalObject(
  state: BilliardsMatchState,
  seat: number,
  angleDeg: number,
  toleranceDeg = 12,
): boolean {
  if (shotAngleHitsLegalObject(state, seat, angleDeg)) {
    return true;
  }
  const ranked = rankAgentPocketShots(state, seat);
  return ranked.some(
    (h) => angularDistanceDegrees(angleDeg, h.pocketAimDeg) <= toleranceDeg,
  );
}
