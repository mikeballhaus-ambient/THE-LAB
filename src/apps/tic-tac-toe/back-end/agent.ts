import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID,
  TicTacToeAgentMoveSchema,
  type TicTacToeAgentMove,
} from '../shared/tic-tac-toe-agent-move-schema';
import { availableMoves, winnerOf, type TicTacToeState } from './rules';
import {
  TIC_TAC_TOE_AGENT_STRATEGY_BY_TIER,
  TIC_TAC_TOE_STRATEGY_CORE,
  TIC_TAC_TOE_USER_TURN_CHECKLIST,
} from './tic-tac-toe-agent-strategy';
import { buildTicTacToeSearchAdvisory } from './tic-tac-toe-search';

/**
 * Tic-Tac-Toe's agent surface: the prompt the model sees and the grading of its
 * tool call.
 *
 * The prompt is deliberately verbose — board render, move history, immediate
 * threats, legal moves, and (on retry) exactly what was wrong last time. A model
 * given only "pick a number" plays randomly; a model told "cell 4 is occupied,
 * you are X, O threatens 2-5-8" plays the game.
 */

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Take an obvious winning line, but do not search for forks.',
  medium: 'Take wins, block immediate threats, prefer the centre early.',
  hard: 'Take wins, block threats, avoid handing over a fork.',
  boss: 'Always take a win, always block, prefer fork-creating cells.',
};

const AGENT_ROLE = 'You are a Tic-Tac-Toe opponent on a 3x3 board.';

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID}\` exactly once with {"index": <cell>}.
- Put the move ONLY in the tool arguments — never in assistant text.
- Cell indices are fixed: 0|1|2 / 3|4|5 / 6|7|8 (left-to-right, top-to-bottom).
- Choose an index from the "Empty cells" list. You cannot claim an occupied cell.
- LOCAL SEARCH HINTS (when present) rank strong cells — you still decide which legal move to submit.
- If a previous attempt was rejected, the reason is given below — do not repeat that move.`;

/**
 * Mark for a seat. Seat 1 is X, seat 2 is O (matches `createInitialState`).
 */
function markFor(seat: number): 'X' | 'O' {
  return seat === 1 ? 'X' : 'O';
}

/** Three-row render of the board using indices for empty cells. */
export function renderBoard(state: TicTacToeState, seat: number): string {
  const me = markFor(seat);
  const rows: string[] = [];
  for (let r = 0; r < 3; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < 3; c += 1) {
      const i = r * 3 + c;
      const v = state.board[i] ?? null;
      cells.push(v === null ? `${i}` : v === seat ? me : me === 'X' ? 'O' : 'X');
    }
    rows.push(` ${cells.join(' | ')}`);
    if (r < 2) {
      rows.push('---+---+---');
    }
  }
  return rows.join('\n');
}

/** Cells where `who` would win by playing (immediate threats). */
function winningCellsFor(state: TicTacToeState, who: number): number[] {
  const hits: number[] = [];
  for (const i of availableMoves(state.board)) {
    const probe = [...state.board];
    probe[i] = who as 1 | 2;
    if (winnerOf(probe) === who) {
      hits.push(i);
    }
  }
  return hits;
}

/** Recent moves, newest last, derived from the board (no separate log exists). */
function moveHistoryLine(state: TicTacToeState): string {
  const occupied = state.board
    .map((v, i) => ({ v, i }))
    .filter((entry) => entry.v !== null);
  if (occupied.length === 0) {
    return 'Moves so far: none — this is the opening move.';
  }
  const xs = occupied.filter((e) => e.v === 1).map((e) => e.i);
  const os = occupied.filter((e) => e.v === 2).map((e) => e.i);
  return `Moves so far: X played [${xs.join(', ')}]; O played [${os.join(', ')}].`;
}

/** The full user prompt for one turn. */
export function buildUserPrompt(
  state: TicTacToeState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const me = markFor(seat);
  const opponent = me === 'X' ? 'O' : 'X';
  const empty = availableMoves(state.board);
  const myWins = winningCellsFor(state, seat);
  const theirWins = winningCellsFor(state, seat === 1 ? 2 : 1);

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are ${me}. Your opponent is ${opponent}.`,
    '',
    'Board (empty cells show their index):',
    renderBoard(state, seat),
    '',
    moveHistoryLine(state),
    `Empty cells you may claim: ${empty.length ? empty.join(', ') : '(none — board is full)'}`,
  ];

  if (myWins.length) {
    lines.push(`You win immediately by playing: ${myWins.join(', ')}.`);
  }
  if (theirWins.length) {
    lines.push(
      `URGENT: ${opponent} wins next turn by playing ${theirWins.join(', ')} — block unless you can win now.`,
    );
  }
  if (!myWins.length && !theirWins.length) {
    lines.push('No immediate win or loss threat this turn.');
  }

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
    lines.push('Submit a different, legal cell.');
  }

  const advisory = buildTicTacToeSearchAdvisory(state, seat, difficulty);
  if (advisory) {
    lines.push('', advisory);
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? TIC_TAC_TOE_USER_TURN_CHECKLIST[difficulty]
      : undefined;
  if (checklist) {
    lines.push('', checklist);
  }

  lines.push('', TOOL_CONTRACT);
  return lines.join('\n');
}

/** Assembled system prompt for a tier. */
export function buildSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${TIC_TAC_TOE_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: TIC_TAC_TOE_AGENT_STRATEGY_BY_TIER,
  });
}

/**
 * Grade a tool call against the rules. Throws an Error whose message is fed back
 * to the model verbatim, so the wording here is instruction, not diagnostics.
 */
export function gradeAgentMove(raw: unknown, state: TicTacToeState): TicTacToeAgentMove {
  const parsed = TicTacToeAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Invalid arguments: ${issue?.message ?? 'expected {"index": 0-8} for a single empty cell.'}`,
    );
  }
  const { index } = parsed.data;

  if (state.finished) {
    throw new Error('The game is already over — no further moves are possible.');
  }
  if (!availableMoves(state.board).includes(index)) {
    const occupant = state.board[index];
    if (occupant !== null && occupant !== undefined) {
      throw new Error(
        `Cell ${index} is already occupied by ${markFor(occupant)}. Pick an empty cell from: ${availableMoves(state.board).join(', ')}.`,
      );
    }
    throw new Error(`Cell ${index} is not on the board. Use 0-8.`);
  }
  return { index };
}

/** Model-facing hint appended to a rejected tool result. */
export function toolResultHint(error: string): string | undefined {
  if (error.includes('already occupied')) {
    return 'Choose an index from the "Empty cells" list in the first user message. Board and turn are unchanged.';
  }
  if (error.includes('already over')) {
    return 'No move is possible; the match has ended.';
  }
  return 'Call the tool again with {"index": <cell>} where cell is listed as empty.';
}

/** Extra nudge on retry, beyond the tool result. */
export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  const attempts = context.priorTurns.length + 1;
  return (
    `Attempt ${attempts} rejected: ${context.lastRejection} ` +
    'Re-read the board and the empty-cell list, then call the tool with a different legal index.'
  );
}

/** Player-facing note while the AI is thinking. */
export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal move — ${error}`;
}
