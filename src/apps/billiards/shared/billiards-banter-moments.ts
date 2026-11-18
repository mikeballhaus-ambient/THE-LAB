import type { MatchView } from '@/shared/game-platform/types';
import { readMatchTurnHistory } from '@/shared/game-platform/use-turn-based-match';
import type { LabAssistantBanterMoment } from '@/shared/game-platform/lab-assistant-banter/types';
import { detectMatchEndBanterMoment } from '@/shared/game-platform/lab-assistant-banter/match-end-moment';
import {
  resolveAssistantSeat,
  resolveHumanSeat,
} from '@/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import type { BilliardsMatchState } from './billiards-types';
import {
  countGroupRemaining,
  groupForBall,
  groupForSeat,
  normalizeBilliardsSeatGroups,
  tableIsOpen,
} from './billiards-rules';
import { countEightBallLegalPocketedForSeat } from './billiards-match-tray-progress';

function normalizeBilliardsState(state: unknown): BilliardsMatchState | null {
  if (!state || typeof state !== 'object') {
    return null;
  }
  return state as BilliardsMatchState;
}

function pocketedSince(prev: BilliardsMatchState, next: BilliardsMatchState): number[] {
  const prevPocketed = new Set(prev.balls.filter((b) => b.pocketed).map((b) => b.number));
  return next.balls.filter((b) => b.pocketed && !prevPocketed.has(b.number)).map((b) => b.number);
}

const SHOOTER_SEAT_IN_SUMMARY_RE = /\bfor seat ([12])\b/i;

/** Parse shooter from rules summary (`— solids for seat 2`). */
export function parseBilliardsShooterSeatFromSummary(summary: string): 1 | 2 | null {
  const m = summary.match(SHOOTER_SEAT_IN_SUMMARY_RE);
  if (!m) {
    return null;
  }
  const seat = Number(m[1]);
  return seat === 1 || seat === 2 ? seat : null;
}

/**
 * Who took the shot on the latest ply — replay beats history when aligned;
 * summary `for seat N` beats a mismatched history seat when replay is absent.
 */
export function resolveBilliardsMoverSeat(
  nextState: BilliardsMatchState,
  historySeat: number,
  summary: string,
): 1 | 2 {
  const fromSummary = parseBilliardsShooterSeatFromSummary(summary);
  const replay = nextState.lastShotReplay;
  if (
    replay &&
    replay.shotsTaken === nextState.shotsTaken &&
    (replay.seat === 1 || replay.seat === 2)
  ) {
    return replay.seat;
  }
  if (fromSummary != null) {
    return fromSummary;
  }
  if (historySeat === 1 || historySeat === 2) {
    return historySeat;
  }
  return 1;
}

/** Appended to moment detail — Sidecar must match this for turn/group talk. */
export function formatBilliardsShootingNextForBanter(
  match: MatchView,
  state: BilliardsMatchState,
): string {
  const humanSeat = resolveHumanSeat(match.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  if (state.ballInHand) {
    const bih = state.ballInHandSeat;
    const zoneLine =
      state.placementZone === 'kitchen'
        ? ' in the **kitchen** (head string / top quarter) for **their** next shot'
        : ' anywhere on the table for **their** next shot';
    if (bih === humanSeat) {
      const placeCue =
        state.phase === 'place_cue' ? ' | Shooting next: human places **their** cue (ball in hand).' : '';
      return ` | Ball in hand: **human player** places **their own** cue ball${zoneLine} — ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} fouled; assistant does **not** place and has no placement turn.${placeCue}`;
    }
    if (bih === assistantSeat) {
      const placeCue =
        state.phase === 'place_cue'
          ? ` | Shooting next: ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} places **their** cue (ball in hand).`
          : '';
      return ` | Ball in hand: **${LAB_ASSISTANT_GAME_OPPONENT_LABEL}** places **their own** cue ball${zoneLine} (human fouled).${placeCue}`;
    }
  } else if (state.phase === 'place_cue') {
    return ' | Shooting next: ball in hand placement.';
  }
  if (state.phase !== 'aim' && state.phase !== 'rolling') {
    return '';
  }
  if (match.currentSeat === humanSeat) {
    return ' | Shooting next: human player (on the clock).';
  }
  if (match.currentSeat === assistantSeat) {
    return ` | Shooting next: ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} (on the clock).`;
  }
  return '';
}

function appendBilliardsShootingNext(
  detail: string,
  match: MatchView,
  state: BilliardsMatchState,
): string {
  return `${detail}${formatBilliardsShootingNextForBanter(match, state)}`;
}

/**
 * Vs Lab Assistant: pocket banter only for noteworthy pots (wrong group, 8, …) — not routine
 * legal assigned-group balls for either player.
 */
export function shouldEmitBilliardsPocketBanter(
  moverSeat: number,
  _yourSeat: number,
  pocketedNumbers: number[],
  nextState: BilliardsMatchState,
): boolean {
  if (pocketedNumbers.length === 0) {
    return false;
  }
  const groups = normalizeBilliardsSeatGroups(nextState);
  const assigned = groupForSeat(groups, moverSeat);
  return pocketedNumbers.some((n) => {
    if (n === 8) {
      return true;
    }
    const g = groupForBall(n);
    if (!g) {
      return false;
    }
    if (tableIsOpen(groups) || assigned == null) {
      return false;
    }
    return g !== assigned;
  });
}

function shooterBanterOwnershipPrefix(moverSeat: number, yourSeat: number): string {
  const humanSeat = resolveHumanSeat(yourSeat);
  if (moverSeat === humanSeat) {
    return 'Human shooter —';
  }
  if (moverSeat === resolveAssistantSeat(humanSeat)) {
    return `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} shooter —`;
  }
  return `Seat ${moverSeat} shooter —`;
}

function formatBallLabel(number: number): string {
  if (number === 0) {
    return 'cue ball';
  }
  if (number === 8) {
    return '8-ball';
  }
  const g = groupForBall(number);
  return g ? `${g} ${number}` : `ball ${number}`;
}

/** Sidecar copy must not treat wrong-group pockets as assigned-group progress. */
export function buildBilliardsPocketBanterDetail(
  pocketedNumbers: number[],
  moverSeat: number,
  seatGroups: ReturnType<typeof normalizeBilliardsSeatGroups>,
  ballsAfter: BilliardsMatchState['balls'],
  keepsTable: boolean,
): string {
  const pocketed = pocketedNumbers.filter((n) => n !== 0);
  if (pocketed.length === 0) {
    return keepsTable ? 'Shooter keeps shooting (legal pocket).' : '';
  }

  const open = tableIsOpen(seatGroups);
  const assigned = groupForSeat(seatGroups, moverSeat);
  const allLabels = pocketed.map(formatBallLabel).join(', ');

  if (open || assigned == null) {
    const keep = keepsTable ? ' Shooter keeps shooting (legal pocket).' : '';
    return `${allLabels}${keep}`;
  }

  const assignedNums: number[] = [];
  const wrongGroupNums: number[] = [];
  for (const n of pocketed) {
    if (n === 8) {
      continue;
    }
    const g = groupForBall(n);
    if (g === assigned) {
      assignedNums.push(n);
    } else if (g) {
      wrongGroupNums.push(n);
    }
  }

  const assignedThisShot =
    assignedNums.length > 0
      ? `This shot assigned-group (${assigned}): ${assignedNums.join(', ')}.`
      : `This shot: no assigned-group (${assigned}) ball — only wrong-group or 8.`;
  const wrongPart =
    wrongGroupNums.length > 0
      ? ` Wrong-group in same shot: ${wrongGroupNums.map(formatBallLabel).join(', ')} (tray only, not ${assigned} progress).`
      : '';

  const legalTotal = countEightBallLegalPocketedForSeat(ballsAfter, moverSeat, seatGroups);
  const remainingOnTable = countGroupRemaining(ballsAfter, assigned);
  const progress = `${assigned} for seat ${moverSeat}: ${legalTotal}/7 pocketed; ${remainingOnTable} ${assigned} still on the table (say "down to ${remainingOnTable}" — not "down to seven" when ${legalTotal} already pocketed).`;

  const countGuard =
    assignedNums.length <= 1
      ? ' Do not say "two down" or plural assigned-group progress unless legal count increased by 2+ on this shot.'
      : '';

  const keep = keepsTable ? ' Shooter keeps shooting (legal pocket).' : '';
  return `Pocketed this shot: ${allLabels}. ${assignedThisShot}${wrongPart} ${progress}${countGuard}${keep}`;
}

/** Wrong object first — turn passes; cue stays on table (no ball in hand). */
export function isBilliardsTurnOnlyFirstContactFoul(
  summary: string,
  options?: { ballInHand?: boolean },
): boolean {
  const lower = summary.toLowerCase();
  const wrongContact =
    lower.includes('wrong ball') ||
    lower.includes('eight ball first') ||
    lower.includes('did not hit lowest');
  if (!wrongContact) {
    return false;
  }
  if (lower.includes('ball in hand') && !lower.includes('no ball in hand')) {
    return false;
  }
  const mentionsScratch = /\bscratch\b/.test(lower) && !lower.includes('not a scratch');
  if (mentionsScratch) {
    return false;
  }
  if (
    lower.includes('turn passes') ||
    lower.includes('lose your turn') ||
    lower.includes('turn only')
  ) {
    return true;
  }
  return options?.ballInHand === false;
}

/** Legal shot line with no pocket and no foul keyword (dry miss / dry break). */
export function isBilliardsDryShotSummary(summary: string): boolean {
  const text = summary.trim();
  if (!/^shot\b/i.test(text)) {
    return false;
  }
  const lower = text.toLowerCase();
  if (lower.includes('pocketed')) {
    return false;
  }
  if (lower.includes('ball in hand') || lower.includes('scratch') || lower.includes('wrong ball')) {
    return false;
  }
  if (lower.includes('eight ball first') || lower.includes('did not hit')) {
    return false;
  }
  return true;
}

/**
 * Balls that dropped on the **same stroke as a foul** are still down — they are not
 * "uncounted" or "not clean". Without this note the Sidecar prompt only sees the rules
 * summary's `pocketed 10, 5` and invents judgement about them.
 */
function foulStrokePocketNote(
  prevState: BilliardsMatchState,
  nextState: BilliardsMatchState,
): string {
  const pocketed = pocketedSince(prevState, nextState).filter((n) => n !== 0);
  if (pocketed.length === 0) {
    return '';
  }
  return ` | Object balls pocketed on this same (foul) stroke: ${pocketed
    .map(formatBallLabel)
    .join(', ')} — they **stay down** and remain in the tray; only the cue ball foul matters.`;
}

function detectBilliardsMidGame(prev: MatchView | null, next: MatchView): LabAssistantBanterMoment | null {
  if (!prev || next.status !== 'active') {
    return null;
  }
  const prevState = normalizeBilliardsState(prev.state);
  const nextState = normalizeBilliardsState(next.state);
  if (!prevState || !nextState) {
    return null;
  }

  const history = readMatchTurnHistory(next.state);
  if (history.length <= readMatchTurnHistory(prev.state).length) {
    return null;
  }
  const last = history[history.length - 1]!;
  const summary = last.summary;
  const moverSeat = resolveBilliardsMoverSeat(nextState, last.seat, summary);
  const ownership = shooterBanterOwnershipPrefix(moverSeat, next.yourSeat);

  const summaryLower = summary.toLowerCase();
  if (summaryLower.includes('eight ball') || summaryLower.includes('pocket the 8')) {
    if (summaryLower.includes('lose') || summaryLower.includes('early')) {
      return {
        kind: 'eight_ball_foul',
        moverSeat,
        detail: appendBilliardsShootingNext(summary, next, nextState),
      };
    }
    return {
      kind: 'highlight',
      moverSeat,
      detail: appendBilliardsShootingNext('ran the 8 to win', next, nextState),
    };
  }

  if (isBilliardsTurnOnlyFirstContactFoul(summary, { ballInHand: nextState.ballInHand })) {
    const pocketNote = foulStrokePocketNote(prevState, nextState);
    return {
      kind: 'highlight',
      moverSeat,
      detail: appendBilliardsShootingNext(
        `${ownership} ${summary}${pocketNote} | Foul type: wrong object first — **turn only** (no ball in hand; cue stays on table; **not a scratch**).`,
        next,
        nextState,
      ),
    };
  }

  if (summaryLower.includes('scratch') || summaryLower.includes('ball in hand')) {
    return {
      kind: 'scratch',
      moverSeat,
      detail: appendBilliardsShootingNext(
        `${shooterBanterOwnershipPrefix(moverSeat, next.yourSeat)} ${summary}${foulStrokePocketNote(
          prevState,
          nextState,
        )}`,
        next,
        nextState,
      ),
    };
  }

  const pocketed = pocketedSince(prevState, nextState).filter((n) => n !== 0);
  if (
    pocketed.includes(8) &&
    nextState.phase === 'finished' &&
    nextState.winnerSeat !== moverSeat
  ) {
    return {
      kind: 'eight_ball_foul',
      moverSeat,
      detail: appendBilliardsShootingNext(summary || 'early 8-ball', next, nextState),
    };
  }

  if (pocketed.length > 0) {
    const groups = normalizeBilliardsSeatGroups(nextState);
    const keepsTable = !nextState.ballInHand && next.currentSeat === moverSeat;
    const emitPocket = shouldEmitBilliardsPocketBanter(
      moverSeat,
      next.yourSeat,
      pocketed,
      nextState,
    );
    if (!emitPocket) {
      const assigned = groupForSeat(groups, moverSeat);
      const assignedOnly = pocketed.filter(
        (n) => n !== 8 && n !== 0 && groupForBall(n) === assigned,
      );
      if (assignedOnly.length > 0 && assigned != null && !keepsTable) {
        return {
          kind: 'highlight',
          moverSeat,
          detail: appendBilliardsShootingNext(
            `${ownership} pocketed **their** assigned ${assigned} ball(s) ${assignedOnly.join(', ')} on this visit — **you** (shooter) scored them, not the human. Opponent shoots next. Forbidden: "solid for you", "stripe for you", or crediting the human with balls you pocketed.`,
            next,
            nextState,
          ),
        };
      }
      return null;
    }
    return {
      kind: 'pocket',
      moverSeat,
      detail: appendBilliardsShootingNext(
        `${ownership} ${buildBilliardsPocketBanterDetail(
          pocketed,
          moverSeat,
          groups,
          nextState.balls,
          keepsTable,
        )}`,
        next,
        nextState,
      ),
    };
  }

  if (nextState.ballInHand && !prevState.ballInHand) {
    const ownership = shooterBanterOwnershipPrefix(moverSeat, next.yourSeat);
    return {
      kind: 'scratch',
      moverSeat,
      detail: appendBilliardsShootingNext(
        `${ownership} ${summary || 'foul — ball in hand'}`,
        next,
        nextState,
      ),
    };
  }

  if (nextState.rulesProfile === 'nine-ball' && summaryLower.includes('pocket the 9')) {
    return {
      kind: 'highlight',
      moverSeat,
      detail: appendBilliardsShootingNext('won on the 9', next, nextState),
    };
  }

  if (
    isBilliardsDryShotSummary(summary) &&
    next.currentSeat !== moverSeat &&
    nextState.phase === 'aim'
  ) {
    const open = tableIsOpen(normalizeBilliardsSeatGroups(nextState));
    const onFelt = nextState.balls.filter((b) => !b.pocketed && b.number > 0).length;
    const spreadNote =
      nextState.shotsTaken <= 2
        ? ' balls may have spread on the break — mention motion/clusters, not "nothing happened".'
        : '';
    return {
      kind: 'highlight',
      moverSeat,
      detail: appendBilliardsShootingNext(
        `${ownership} dry shot — no object ball pocketed this stroke; ${onFelt} object balls on the felt${spreadNote}; table ${open ? 'still open (no solids/stripes assigned yet)' : 'groups unchanged'}; turn passes to opponent.`,
        next,
        nextState,
      ),
    };
  }

  return null;
}

/**
 * Detect a single Sidecar banter moment after a billiards match update (vs Lab Assistant).
 * Priority: match end > eight-ball foul > scratch/foul > pocket > group claim.
 */
function detectBilliardsMatchEndFromTableState(
  prev: MatchView | null,
  next: MatchView,
): LabAssistantBanterMoment | null {
  const nextState = normalizeBilliardsState(next.state);
  const prevState = prev ? normalizeBilliardsState(prev.state) : null;
  if (!nextState || nextState.phase !== 'finished' || prevState?.phase === 'finished') {
    return null;
  }
  if (prev?.status === 'finished') {
    return null;
  }
  const winnerSeat = nextState.winnerSeat;
  if (winnerSeat == null) {
    return { kind: 'match_draw' };
  }
  if (winnerSeat === next.yourSeat) {
    return { kind: 'match_loss', moverSeat: winnerSeat };
  }
  return { kind: 'match_win', moverSeat: winnerSeat };
}

export function detectBilliardsBanterMoment(
  prev: MatchView | null,
  next: MatchView,
): LabAssistantBanterMoment | null {
  if (next.opponentKind !== 'ai') {
    return null;
  }
  /** Table `winnerSeat` is authoritative when match view `winnerUserId` lags on early 8 / frame end. */
  return (
    detectBilliardsMatchEndFromTableState(prev, next) ??
    detectMatchEndBanterMoment(prev, next) ??
    detectBilliardsMidGame(prev, next)
  );
}
