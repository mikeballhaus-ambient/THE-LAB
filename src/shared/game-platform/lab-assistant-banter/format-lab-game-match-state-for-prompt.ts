import type { LabSidecarGameMatchSnapshot } from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';
import {
  resolveAssistantSeat,
  resolveHumanSeat,
} from '@/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import { resolveLabGameHumanDisplayName } from '@/shared/constants/lab-game-human-display-name';
import {
  countGroupRemaining,
  groupForBall,
  groupForSeat,
  normalizeBilliardsSeatGroups,
  tableIsOpen,
} from '@/apps/billiards/shared/billiards-rules';
import { countEightBallLegalPocketedForSeat } from '@/apps/billiards/shared/billiards-match-tray-progress';
import type {
  BilliardsAssignedGroup,
  BilliardsBall,
  BilliardsMatchState,
} from '@/apps/billiards/shared/billiards-types';

function formatGroupBallNumbersOnFelt(
  balls: BilliardsBall[],
  group: BilliardsAssignedGroup,
): string {
  const nums = balls
    .filter((b) => !b.pocketed && groupForBall(b.number) === group)
    .map((b) => b.number)
    .sort((a, b) => a - b);
  return nums.length > 0 ? nums.join(', ') : 'none';
}

/** Max JSON chars for Sidecar / banter prompts (avoid blowing context on huge states). */
export const LAB_GAME_MATCH_STATE_PROMPT_MAX_CHARS = 48_000;

const BANTER_REPLY_CLOSING_PREFIX = 'Reply with exactly **one** short spoken sentence';

export const LAB_GAME_BOARD_GROUNDING_RULES = `### Board grounding (required)
- **Game state JSON**, **piece roster** (when present), and **Turn history** are the only sources of truth for squares, piece types, and who moved.
- For captures: only the side named in **Who just moved** (banter Facts) took material; the other side lost it — never reverse or praise the opponent for your capture.
- Before naming a piece type or square in table talk, verify it on the roster/JSON (e.g. do not call a1 a "queen" if the roster shows a knight on a1).
- Metadata labels (Lab user display name when shown, on the clock, seat numbers in JSON) are for reasoning only — **never** say the display name in every banter line; use "you" or no address. Also **never** repeat "seat 1/2", "your turn now", or "what's next?" in spoken Sidecar replies.`;

function seatActorLabel(
  snapshot: LabSidecarGameMatchSnapshot,
  seat: number,
  humanSeat: 1 | 2,
  assistantSeat: 1 | 2,
): string {
  if (seat === humanSeat) {
    return resolveLabGameHumanDisplayName(snapshot.humanDisplayName);
  }
  if (seat === assistantSeat) {
    return LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  }
  return `player ${seat}`;
}

export function stringifyMatchStateForPrompt(
  state: unknown,
  maxChars: number = LAB_GAME_MATCH_STATE_PROMPT_MAX_CHARS,
): string {
  let text: string;
  try {
    text = JSON.stringify(state);
  } catch {
    return '{"error":"match state not JSON-serializable"}';
  }
  if (text.length <= maxChars) {
    return text;
  }
  const omitted = text.length - maxChars;
  return `${text.slice(0, maxChars)}\n/* truncated ${omitted} characters */`;
}

function chessSquareName(row: number, col: number): string {
  const file = 'abcdefgh'[col] ?? '?';
  return `${file}${8 - row}`;
}

function chessColorToSeat(color: string): 1 | 2 {
  return color === 'white' ? 1 : 2;
}

type ChessPieceLike = { row: number; col: number; type: string; color: string };

type BilliardsBallLike = { number: number; x: number; y: number; pocketed?: boolean };

function formatBilliardsBallRoster(snapshot: LabSidecarGameMatchSnapshot): string | null {
  if (snapshot.gameId !== 'billiards' && snapshot.gameId !== 'billiards-practice') {
    return null;
  }
  const state = snapshot.state;
  if (!state || typeof state !== 'object') {
    return null;
  }
  const balls = (state as { balls?: unknown }).balls;
  if (!Array.isArray(balls) || balls.length === 0) {
    return null;
  }
  const lines: string[] = [];
  for (const raw of balls) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const b = raw as BilliardsBallLike;
    if (typeof b.number !== 'number' || b.pocketed) {
      continue;
    }
    const label = b.number === 0 ? 'cue' : `#${b.number}`;
    lines.push(
      `${label} at (${typeof b.x === 'number' ? b.x.toFixed(0) : '?'}, ${typeof b.y === 'number' ? b.y.toFixed(0) : '?'})`,
    );
  }
  lines.sort((a, b) => a.localeCompare(b));
  if (lines.length === 0) {
    return null;
  }
  return `### Billiards ball roster (verify numbers and positions here)
${lines.join('\n')}`;
}

function isBilliardsSidecarPromptGameId(gameId: string): boolean {
  return gameId === 'billiards' || gameId === 'billiards-practice';
}

function formatBilliardsMatchFlowForPrompt(snapshot: LabSidecarGameMatchSnapshot): string | null {
  if (!isBilliardsSidecarPromptGameId(snapshot.gameId)) {
    return null;
  }
  const state = snapshot.state;
  if (!state || typeof state !== 'object') {
    return null;
  }
  const humanSeat = resolveHumanSeat(snapshot.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const humanLabel = resolveLabGameHumanDisplayName(snapshot.humanDisplayName);
  const onClockSeat = snapshot.currentSeat;
  const onClock =
    onClockSeat === humanSeat ? humanLabel : LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  const groups = normalizeBilliardsSeatGroups(
    state as Pick<BilliardsMatchState, 'seatGroups' | 'playerGroup'>,
  );
  const open = tableIsOpen(groups);
  const humanGroup = groupForSeat(groups, humanSeat);
  const assistantGroup = groupForSeat(groups, assistantSeat);
  const ballInHand = Boolean((state as { ballInHand?: boolean }).ballInHand);
  const ballInHandSeat = (state as { ballInHandSeat?: number | null }).ballInHandSeat;
  const placementZone = (state as { placementZone?: string }).placementZone ?? 'table';
  const phase = (state as { phase?: string }).phase ?? 'unknown';
  const balls = (state as { balls?: BilliardsBall[] }).balls ?? [];
  const objectOnFelt = balls.filter((b) => !b.pocketed && b.number > 0).length;
  const objectPocketed = balls.filter((b) => b.pocketed && b.number > 0).length;
  const feltCountLine = `- **Balls on felt:** ${objectOnFelt} object balls on the table, ${objectPocketed} object balls pocketed this frame (plus cue ball when listed in roster). A break or spread moves balls — do not claim "nothing happened" when counts match a full rack.`;
  const progressLine =
    !open && humanGroup && assistantGroup
      ? (() => {
          const humanPocketed = countEightBallLegalPocketedForSeat(balls, humanSeat, groups);
          const asstPocketed = countEightBallLegalPocketedForSeat(balls, assistantSeat, groups);
          const humanRemain = countGroupRemaining(balls, humanGroup);
          const asstRemain = countGroupRemaining(balls, assistantGroup);
          const asstBallRange = assistantGroup === 'solids' ? '1–7' : '9–15';
          const humanOnFelt = formatGroupBallNumbersOnFelt(balls, humanGroup);
          const asstOnFelt = formatGroupBallNumbersOnFelt(balls, assistantGroup);
          const eightOnFelt = balls.some((b) => b.number === 8 && !b.pocketed);
          const bothGroupsCleared = humanRemain === 0 && asstRemain === 0;
          return `- **Group progress:** ${humanLabel} ${humanGroup} ${humanPocketed}/7 pocketed, **${humanRemain}** still on table; ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} ${assistantGroup} ${asstPocketed}/7 pocketed, **${asstRemain}** still on table.
- **On felt (group balls only):** ${humanLabel} ${humanGroup}: **${humanOnFelt}**; ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} ${assistantGroup}: **${asstOnFelt}** (ball **8** is separate${eightOnFelt ? ', 8 is on the felt' : ', 8 pocketed or not listed here'}).
- **Wording:** \`N/7\` = pocketed toward clearing the group; **still on table** = balls left of that group. For **you (Sidecar / ${LAB_ASSISTANT_GAME_OPPONENT_LABEL})**, "my group left" means **${asstRemain}** ${assistantGroup} (${asstBallRange}) — not the human's ${humanRemain} ${humanGroup}.
- **"Cleared" / "all gone":** Say a group is cleared **only** when its **still on table** is **0** (on-felt list **none**). If **still on table ≥ 1**, forbidden: "all your solids gone", "cleared my stripes", "only the eight left" for that side.
- **Race to the eight:** ${bothGroupsCleared ? 'Both assigned groups are cleared on the felt — eight-ball shootout talk is OK if the 8 is live.' : `Not yet — ${humanRemain > 0 ? `${humanLabel} still has ${humanRemain} ${humanGroup} ball(s) on the felt` : `${humanLabel} group cleared`}; ${asstRemain > 0 ? `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} still has ${asstRemain} ${assistantGroup} ball(s)` : `${LAB_ASSISTANT_GAME_OPPONENT_LABEL} group cleared`}. Forbidden: "both cleared", "who pockets the eight first" while either on-felt list is not **none**.`}`;
        })()
      : '';
  const sidecarIdentityBlock = open
    ? `- **Sidecar identity:** Table is **open** — forbidden: "my solids", "my stripes", "your solids", or "your stripes" until assignments appear under **Eight-ball groups**.
`
    : humanGroup && assistantGroup
      ? `- **Sidecar identity (fixed this match):** You are **${LAB_ASSISTANT_GAME_OPPONENT_LABEL}** → **${assistantGroup}**. Human → **${humanGroup}**. First person **my ${assistantGroup}** only; address human as **your ${humanGroup}** — never **my ${humanGroup}** for yourself.
- **Forbidden:** swapping groups in one sentence (e.g. "six stripes left while I hunt my solids"); claiming the human's group as yours; inventing progress for the wrong group.
`
      : '';
  const profileNote =
    (state as { rulesProfile?: string }).rulesProfile === 'eight-ball'
      ? '- **Rules:** eight-ball — ball **9** is a stripe (not “winning the nine”).\n'
      : '';
  const winnerSeat = (state as { winnerSeat?: number | null }).winnerSeat ?? null;
  const frameOver = snapshot.status === 'finished' || phase === 'finished';
  const matchResultLine = frameOver
    ? (() => {
        if (winnerSeat === humanSeat) {
          return `- **Match result (FINISHED):** ${humanLabel} won — ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} **lost**. The frame is over; do not invite another rack or pretend anyone is still shooting unless the user asks for a rematch.\n`;
        }
        if (winnerSeat === assistantSeat) {
          return `- **Match result (FINISHED):** ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} won — ${humanLabel} lost. The frame is over.\n`;
        }
        return '- **Match result (FINISHED):** frame complete (winner unknown in snapshot).\n';
      })()
    : '';
  const ballInHandLine =
    ballInHand && (ballInHandSeat === 1 || ballInHandSeat === 2)
      ? (() => {
          const placer =
            ballInHandSeat === humanSeat ? humanLabel : LAB_ASSISTANT_GAME_OPPONENT_LABEL;
          const waiter =
            ballInHandSeat === humanSeat ? LAB_ASSISTANT_GAME_OPPONENT_LABEL : humanLabel;
          const zone =
            placementZone === 'kitchen'
              ? 'kitchen only (behind head string)'
              : 'full table';
          return `- **Ball in hand:** ${placer} places **their own** cue ball for **their** visit (${zone}). ${waiter} waits — does **not** place the cue. Sidecar: never imply ${waiter} is placing ${placer}'s cue or "place mine wherever you like".\n`;
        })()
      : '';
  return `### Billiards table flow (authoritative for turn / groups)
${matchResultLine}- **On the clock now:** ${onClock}. Do **not** say it is your turn if ${onClock} is not you.
- **Phase:** ${phase}${ballInHand ? ' — ball in hand active' : ''}.
${ballInHandLine}
${feltCountLine}
${profileNote}${sidecarIdentityBlock}- **Eight-ball groups:** ${open ? 'table open' : `${humanLabel}: ${humanGroup ?? 'unassigned'}; ${LAB_ASSISTANT_GAME_OPPONENT_LABEL}: ${assistantGroup ?? 'unassigned'}`}.
${progressLine}
- After a **legal pocket** with no foul, the shooter usually **keeps shooting** until they miss, foul, or the turn passes in match metadata.
- **Group talk:** One shot can pocket both a stripe and a solid — only the shooter's **assigned group** counts toward progress; wrong-group balls are tray clutter, not "two stripes".
- **Eight ball first** (foul name) = hit the 8 before your group is clear or wrong first contact — **not** "racing to pocket the 8". Never brag about "pocketing the 8 first" on a foul or wrong-ball moment.
- Cue ball on the table belongs to the live shot — do not talk about your cue ball being "safe" when the opponent just shot.`;
}

type BattleshipStateSlice = {
  fleets?: Record<number, unknown>;
  shotsAt?: Record<number, Record<string, 'hit' | 'miss'>>;
  scores?: Record<number, number>;
};

export interface FormatLabGameMatchStateOptions {
  /** Proactive banter — strip all hole cards so spoken lines cannot leak pocket ranks. */
  proactiveBanter?: boolean;
}

type PokerHoldemStateSlice = {
  holes?: Record<number, unknown>;
  deck?: unknown;
  board?: unknown[];
};

function redactPokerHoldemStateForSidecarPrompt(
  state: unknown,
  yourSeat: number,
  options?: FormatLabGameMatchStateOptions,
): unknown {
  if (!state || typeof state !== 'object') {
    return state;
  }
  const slice = { ...(state as PokerHoldemStateSlice) };
  const humanSeat = yourSeat === 2 ? 2 : 1;
  const assistantSeat = humanSeat === 1 ? 2 : 1;
  const hiddenMark = '[2 cards hidden — not for spoken table talk]';

  if (options?.proactiveBanter) {
    slice.holes = { 1: hiddenMark, 2: hiddenMark };
    delete slice.deck;
    return {
      ...slice,
      banterNote:
        'Hole cards and deck omitted from proactive banter — use board, pot, and turn history only.',
    };
  }

  if (slice.holes && typeof slice.holes === 'object') {
    const holes = { ...(slice.holes as Record<number, unknown>) };
    holes[assistantSeat] = hiddenMark;
    return {
      ...slice,
      holes,
      sidecarNote: 'Lab Assistant hole cards hidden in Sidecar JSON.',
    };
  }
  return slice;
}

function formatPokerHoldemFogForPrompt(
  snapshot: LabSidecarGameMatchSnapshot,
  options?: FormatLabGameMatchStateOptions,
): string | null {
  if (snapshot.gameId !== 'poker-holdem') {
    return null;
  }
  const state = snapshot.state;
  const boardLen =
    state && typeof state === 'object' && Array.isArray((state as PokerHoldemStateSlice).board)
      ? (state as PokerHoldemStateSlice).board!.length
      : 0;
  const lines = [
    "### Texas Hold'em (fog of war)",
    `- **Community cards:** ${boardLen} on the board in JSON.`,
    '- **Hole cards:** hidden at the table until showdown.',
    '- **Forbidden spoken lines:** naming pocket cards ("I have aces", "pocket kings", "ace-king") for **you or the human** — humans only see their own two cards in the UI.',
  ];
  if (options?.proactiveBanter) {
    lines.push(
      '- **Banter voice:** bluffs and pressure without ranks — "big hand", "scary board", "you like that flop?" — never cite specific hole cards.',
    );
  }
  return lines.join('\n');
}

function redactBattleshipStateForBanterPrompt(state: unknown, yourSeat: number): unknown {
  if (!state || typeof state !== 'object') {
    return state;
  }
  const slice = state as BattleshipStateSlice;
  const humanSeat = yourSeat === 2 ? 2 : 1;
  const fleets =
    slice.fleets && typeof slice.fleets === 'object'
      ? { [humanSeat]: slice.fleets[humanSeat] }
      : slice.fleets;
  return {
    ...slice,
    fleets,
    banterNote: 'Enemy fleet positions omitted from Sidecar snapshot — use shot maps only.',
  };
}

function countShotResults(shots: Record<string, 'hit' | 'miss'> | undefined, result: 'hit' | 'miss'): number {
  if (!shots) {
    return 0;
  }
  return Object.values(shots).filter((v) => v === result).length;
}

function formatBattleshipTrackingForPrompt(snapshot: LabSidecarGameMatchSnapshot): string | null {
  if (snapshot.gameId !== 'battleship') {
    return null;
  }
  const humanSeat = resolveHumanSeat(snapshot.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const state = snapshot.state as BattleshipStateSlice;
  const humanShots = state.shotsAt?.[humanSeat] ?? {};
  const shotsAtHuman = state.shotsAt?.[assistantSeat] ?? {};
  const humanHits = countShotResults(humanShots, 'hit');
  const humanMisses = countShotResults(humanShots, 'miss');
  const humanTakingHits = countShotResults(shotsAtHuman, 'hit');
  const afloatOpponent = state.scores?.[assistantSeat];
  const afloatHuman = state.scores?.[humanSeat];
  const scoreLine =
    typeof afloatOpponent === 'number' && typeof afloatHuman === 'number'
      ? `- **Ships still afloat (public scores):** you ${afloatHuman}; ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} ${afloatOpponent}.`
      : '';
  return `### Battleship tracking (fog of war — human-visible)
- **Your tracking grid:** ${humanHits} hit marks, ${humanMisses} misses on enemy waters (coordinates stay on the board UI — do **not** read grid coords aloud in Sidecar).
- **Shots landing on your fleet:** ${humanTakingHits} hit marks visible on your fleet panel.
${scoreLine}
- Hidden enemy **ship classes and layouts** are not in Facts — never say "destroyer" / "carrier" or a cell address unless match-end recap.`;
}

function formatChessPieceRoster(snapshot: LabSidecarGameMatchSnapshot): string | null {
  if (snapshot.gameId !== 'chess') {
    return null;
  }
  const state = snapshot.state;
  if (!state || typeof state !== 'object') {
    return null;
  }
  const pieces = (state as { pieces?: unknown }).pieces;
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return null;
  }
  const humanSeat = resolveHumanSeat(snapshot.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const lines: string[] = [];
  for (const raw of pieces) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const p = raw as ChessPieceLike;
    if (
      typeof p.row !== 'number' ||
      typeof p.col !== 'number' ||
      typeof p.type !== 'string' ||
      typeof p.color !== 'string'
    ) {
      continue;
    }
    const square = chessSquareName(p.row, p.col);
    const ownerSeat = chessColorToSeat(p.color);
    const owner = seatActorLabel(snapshot, ownerSeat, humanSeat, assistantSeat);
    lines.push(`${square}: ${p.color} ${p.type} (${owner})`);
  }
  lines.sort((a, b) => a.localeCompare(b));
  if (lines.length === 0) {
    return null;
  }
  return `### Chess piece roster (verify piece types and squares here)
${lines.join('\n')}`;
}

/** Who holds the shot clock — included in banter so the model does not hand the turn back wrongly. */
export function formatMatchClockForBanterPrompt(snapshot: LabSidecarGameMatchSnapshot): string {
  const humanSeat = resolveHumanSeat(snapshot.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const onClock = seatActorLabel(snapshot, snapshot.currentSeat, humanSeat, assistantSeat);
  const humanOnClock = snapshot.currentSeat === humanSeat;
  const lastMover =
    snapshot.lastTurn != null
      ? seatActorLabel(snapshot, snapshot.lastTurn.seat, humanSeat, assistantSeat)
      : null;
  const lines = [
    '### Turn clock (authoritative)',
    `- **On the clock now:** ${onClock}.`,
    `- **Human just moved (last history ply):** ${lastMover ?? 'unknown'}.`,
    humanOnClock
      ? '- **Spoken rule:** The human is on the clock — you are waiting; do not tell them it is "your turn" unless you mean **their** turn.'
      : `- **Spoken rule:** You (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) are on the clock — react to their last play, then **do not** say "your turn now" to the human.`,
    '- **Forbidden spoken lines:** "your turn now", "over to you", "ball\'s in your court" when **On the clock** is not the human player.',
  ];
  return lines.join('\n');
}

export function formatLabGameTurnHistoryForPrompt(snapshot: LabSidecarGameMatchSnapshot): string {
  if (snapshot.turnHistory.length === 0) {
    return '(no moves recorded yet)';
  }
  const humanSeat = resolveHumanSeat(snapshot.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  return snapshot.turnHistory
    .map(
      (entry, index) =>
        `${index + 1}. ${seatActorLabel(snapshot, entry.seat, humanSeat, assistantSeat)}: ${entry.summary}`,
    )
    .join('\n');
}

/**
 * Full turn history + serialized match state for Sidecar user chat and proactive banter.
 * State is the same human-visible payload the app receives in {@link MatchView.state}.
 */
export function formatLabGameMatchStateSections(
  snapshot: LabSidecarGameMatchSnapshot,
  options?: FormatLabGameMatchStateOptions,
): string {
  const clockBlock =
    snapshot.status === 'active' ? `${formatMatchClockForBanterPrompt(snapshot)}\n\n` : '';
  const historyBlock = formatLabGameTurnHistoryForPrompt(snapshot);
  let stateForJson: unknown = snapshot.state;
  if (snapshot.gameId === 'battleship') {
    stateForJson = redactBattleshipStateForBanterPrompt(snapshot.state, snapshot.yourSeat);
  } else if (snapshot.gameId === 'poker-holdem') {
    stateForJson = redactPokerHoldemStateForSidecarPrompt(snapshot.state, snapshot.yourSeat, options);
  }
  const stateJson = stringifyMatchStateForPrompt(stateForJson);
  const roster =
    formatBilliardsBallRoster(snapshot) ??
    formatChessPieceRoster(snapshot) ??
    formatBattleshipTrackingForPrompt(snapshot);
  const flow =
    formatBilliardsMatchFlowForPrompt(snapshot) ?? formatPokerHoldemFogForPrompt(snapshot, options);
  const rosterBlock = roster ? `${roster}\n\n` : '';
  const flowBlock = flow ? `${flow}\n\n` : '';
  return `${LAB_GAME_BOARD_GROUNDING_RULES}

${clockBlock}### Turn history (full)
${historyBlock}

${rosterBlock}${flowBlock}### Game state (JSON — human-visible match state from the app)
\`\`\`json
${stateJson}
\`\`\``;
}

/** Insert snapshot before banter closing "Reply with exactly…" so the model reads board data first. */
export function appendLabGameMatchSnapshotToPrompt(
  basePrompt: string,
  snapshot: LabSidecarGameMatchSnapshot | undefined,
): string {
  if (!snapshot) {
    return basePrompt;
  }
  const stateBlock = formatLabGameMatchStateSections(snapshot, { proactiveBanter: true });
  const idx = basePrompt.lastIndexOf(BANTER_REPLY_CLOSING_PREFIX);
  if (idx === -1) {
    return `${basePrompt}\n\n${stateBlock}`;
  }
  return `${basePrompt.slice(0, idx).trimEnd()}\n\n${stateBlock}\n\n${basePrompt.slice(idx)}`;
}
