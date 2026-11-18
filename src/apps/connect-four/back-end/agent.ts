import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID,
  ConnectFourAgentMoveSchema,
} from '../shared/connect-four-agent-move-schema';
import {
  CONNECT_LENGTH,
  COLS,
  ROWS,
  availableColumns,
  dropRow,
  winnerOf,
  type CfCell,
  type ConnectFourMove,
  type ConnectFourState,
} from './rules';
import {
  CONNECT_FOUR_AGENT_STRATEGY_BY_TIER,
  CONNECT_FOUR_STRATEGY_CORE,
  CONNECT_FOUR_USER_TURN_CHECKLIST,
} from './connect-four-agent-strategy';
import { buildConnectFourSearchAdvisory } from './connect-four-search';

/**
 * Connect Four's agent surface: prompt construction and tool-call grading.
 *
 * The game is gravity-bound — a model that wants row 2 cannot have it, only the
 * column — so the prompt spells that out and the grader explains it on rejection.
 */

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Take an obvious win, otherwise pick a comfortable column.',
  medium: 'Take wins, block threats, prefer the centre.',
  hard: 'Take wins, block threats, avoid creating opponent threats.',
  boss: 'Win, block, otherwise create double threats.',
};

const AGENT_ROLE = 'You are a Connect Four opponent on a 7-wide by 6-tall board.';

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${CONNECT_FOUR_SUBMIT_MOVE_TOOL_ID}\` exactly once with {"col": <0-6>}.
- Put the move ONLY in the tool arguments — never in assistant text.
- Columns are 0-6, left to right. You choose a COLUMN only — the disc falls to the
  lowest empty row, so the row is not yours to pick.
- Only a column listed as open may be chosen; a full column is illegal.
- LOCAL SEARCH HINTS (when present) rank strong columns — you still decide which legal move to submit.
- If a previous attempt was rejected, the reason is given below — do not repeat it.`;

/** 6-row render. `X`/`O` for the two seats, `.` empty, plus column numbers. */
export function renderBoard(state: ConnectFourState, seat: number): string {
  const mark = (v: CfCell): string => (v === null ? '.' : v === seat ? 'X' : 'O');
  const lines: string[] = ['   0 1 2 3 4 5 6'];
  for (let r = 0; r < ROWS; r += 1) {
    const cells = state.board[r]!.map(mark);
    lines.push(`${r}  ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

/** Columns where `who` would win immediately by dropping. */
function winningColumnsFor(state: ConnectFourState, who: 1 | 2): number[] {
  const hits: number[] = [];
  for (const col of availableColumns(state.board)) {
    const probe = state.board.map((row) => [...row]);
    const r = dropRow(probe, col);
    if (r < 0) {
      continue;
    }
    probe[r]![col] = who;
    if (winnerOf(probe) === who) {
      hits.push(col);
    }
  }
  return hits;
}

export function buildUserPrompt(
  state: ConnectFourState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const open = availableColumns(state.board);
  const myWins = winningColumnsFor(state, seat as 1 | 2);
  const theirWins = winningColumnsFor(state, (seat === 1 ? 2 : 1) as 1 | 2);
  const opponent = seat === 1 ? 'O' : 'X';

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are ${seat === 1 ? 'X' : 'O'}. Your opponent is ${opponent}.`,
    `Match ${CONNECT_LENGTH} in a row — horizontally, vertically or diagonally — to win.`,
    '',
    'Board (X = you, O = opponent, . = empty; the first line is the column numbers):',
    renderBoard(state, seat),
    '',
    `Open columns you may drop into: ${open.length ? open.join(', ') : '(none — board is full)'}`,
    `Moves played so far: ${state.moveCount}.`,
  ];

  if (myWins.length) {
    lines.push(`You win immediately by dropping in column: ${myWins.join(', ')}.`);
  }
  if (theirWins.length) {
    lines.push(
      `URGENT: ${opponent} wins next turn by dropping in column ${theirWins.join(', ')} — block unless you can win now.`,
    );
  }
  if (!myWins.length && !theirWins.length) {
    lines.push('No immediate win or loss threat this turn.');
  }

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
  }

  const advisory = buildConnectFourSearchAdvisory(state, seat, difficulty);
  if (advisory) {
    lines.push('', advisory);
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? CONNECT_FOUR_USER_TURN_CHECKLIST[difficulty]
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
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${CONNECT_FOUR_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: CONNECT_FOUR_AGENT_STRATEGY_BY_TIER,
  });
}

/** Grade a tool call; throws with a model-facing reason when the drop is illegal. */
export function gradeAgentMove(
  raw: unknown,
  state: ConnectFourState,
  seat: number,
): ConnectFourMove {
  void seat;
  const parsed = ConnectFourAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid arguments: ${issue?.message ?? 'expected {"col": 0-6}.'}`);
  }
  const { col } = parsed.data;

  if (state.finished) {
    throw new Error('The game is already over — no further moves are possible.');
  }
  if (col < 0 || col >= COLS) {
    throw new Error(`Column ${col} is not on the board. Valid columns are 0-${COLS - 1}.`);
  }
  const open = availableColumns(state.board);
  if (!open.includes(col)) {
    throw new Error(
      `Column ${col} is full. Open columns are: ${open.length ? open.join(', ') : '(none)'}.`,
    );
  }
  return { type: 'drop', col };
}

/** Model-facing hint appended to a rejected tool result. */
export function toolResultHint(error: string): string | undefined {
  if (error.includes('full')) {
    return 'That column already reaches the top. Choose a column from the open list.';
  }
  if (error.includes('already over')) {
    return 'The match has ended; no move is possible.';
  }
  return 'You choose a COLUMN (0-6) only — the disc falls to the lowest empty row.';
}

/** Extra nudge on retry. */
export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  return (
    `Attempt ${context.priorTurns.length + 1} rejected: ${context.lastRejection} ` +
    'Re-read the open-column list and submit a different column.'
  );
}

/** Player-facing note while the AI is thinking. */
export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal drop — ${error}`;
}
