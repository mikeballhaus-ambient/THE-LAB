import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import { agentDifficultyLine, buildAgentSystemPrompt } from '@/shared/game-platform/difficulty-policy';
import {
  CHECKERS_SUBMIT_MOVE_TOOL_ID,
  CheckersAgentMoveSchema,
} from '../shared/checkers-agent-move-schema';
import {
  BOARD_SIZE,
  legalMovesFor,
  pieceAt,
  type CheckersMove,
  type CheckersState,
} from './rules';
import {
  CHECKERS_AGENT_STRATEGY_BY_TIER,
  CHECKERS_STRATEGY_CORE,
  CHECKERS_USER_TURN_CHECKLIST,
} from './checkers-agent-strategy';
import { buildCheckersSearchAdvisory } from './checkers-search';

/**
 * Checkers' agent surface: prompt construction and tool-call grading.
 *
 * Captures are optional in this app's rules — any legal quiet move or jump is allowed.
 */

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Move forward when you can; take a capture when it is obvious.',
  medium: 'Prefer captures that gain material; protect your back row.',
  hard: 'Prefer captures that do not expose a double jump.',
  boss: 'Maximise material and deny the opponent safe moves.',
};

const AGENT_ROLE = 'You are a Checkers (draughts) opponent on an 8x8 board.';
const MAN_MOVES_UP = 'Seat 1 (you if you are seat 1) starts on rows 5-7 and moves UP (row decreases).';

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${CHECKERS_SUBMIT_MOVE_TOOL_ID}\` exactly once with {"pieceId": <id>, "toRow": <n>, "toCol": <n>}.
- Put the move ONLY in the tool arguments — never in assistant text.
- pieceId must be copied EXACTLY from one of the legal moves listed below; do not invent one.
- Row 0 is the top row, row 7 the bottom. Column 0 is the left edge.
- Captures are optional to start, but if you jump and can jump again you must continue with the same piece until no further jump is listed.
- LOCAL SEARCH HINTS (when present) rank strong lines — you still decide which legal move to submit.
- If a previous attempt was rejected, the reason is given below — do not repeat that move.`;

/** 8x8 render. `M` = your piece, `O` = opponent, trailing `K` = king. */
export function renderBoard(state: CheckersState, seat: number): string {
  const lines: string[] = ['   0 1 2 3 4 5 6 7'];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const p = pieceAt(state.pieces, r, c);
      if (!p) {
        cells.push('.');
      } else {
        const mine = p.color === seat;
        cells.push(`${mine ? 'M' : 'O'}${p.isKing ? 'K' : 'm'}`);
      }
    }
    lines.push(`${r}  ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

/** Every legal (pieceId -> destination) pair for this seat, as prompt text. */
function legalMoveList(state: CheckersState, seat: number): string[] {
  const out: string[] = [];
  for (const p of state.pieces) {
    if (p.color !== seat) {
      continue;
    }
    for (const d of legalMovesFor(state, p)) {
      out.push(`${p.id}:${d.row},${d.col}`);
    }
  }
  return out;
}

export function buildUserPrompt(
  state: CheckersState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const legal = legalMoveList(state, seat);
  const mine = state.pieces.filter((p) => p.color === seat).length;
  const theirs = state.pieces.filter((p) => p.color !== seat).length;

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are seat ${seat}. You have ${mine} piece(s); your opponent has ${theirs}.`,
    MAN_MOVES_UP,
    '',
    'Board (M = your piece, O = opponent, trailing K = king, . = empty):',
    renderBoard(state, seat),
    '',
    ...(state.jumpChainPieceId != null
      ? [
          `JUMP CHAIN — continue capturing with piece ${state.jumpChainPieceId}. Only further jumps for that piece are legal until the chain ends.`,
          '',
        ]
      : []),
    `Moves played so far: ${state.moveCount}.`,
    '',
    `Legal moves (${legal.length}) as "pieceId:toRow,toCol":`,
    legal.length ? legal.join('  ') : '(none — you have no legal move)',
  ];

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
    lines.push('Choose a different entry from the legal-move list above.');
  }

  const advisory = buildCheckersSearchAdvisory(state, seat, difficulty);
  if (advisory) {
    lines.push('', advisory);
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? CHECKERS_USER_TURN_CHECKLIST[difficulty]
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
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${CHECKERS_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: CHECKERS_AGENT_STRATEGY_BY_TIER,
  });
}

/**
 * Grade a tool call. Returns the normalised {@link CheckersMove}; throws with a
 * model-facing explanation when the move is illegal.
 */
export function gradeAgentMove(
  raw: unknown,
  state: CheckersState,
  seat: number,
): CheckersMove {
  const parsed = CheckersAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Invalid arguments: ${issue?.message ?? 'expected {"pieceId": <id>, "toRow": 0-7, "toCol": 0-7}.'}`,
    );
  }
  const { pieceId, toRow, toCol } = parsed.data;

  if (state.finished) {
    throw new Error('The game is already over — no further moves are possible.');
  }

  const piece = state.pieces.find((p) => String(p.id) === String(pieceId));
  if (!piece) {
    const mine = state.pieces.filter((p) => p.color === seat).map((p) => p.id);
    throw new Error(
      `There is no piece with id "${pieceId}". Your piece ids are: ${mine.join(', ')}.`,
    );
  }
  if (piece.color !== seat) {
    throw new Error(
      `Piece ${pieceId} is not yours — it belongs to seat ${piece.color}. Move one of your own pieces.`,
    );
  }

  const legal = legalMovesFor(state, piece);
  const ok = legal.some((d) => d.row === toRow && d.col === toCol);
  if (!ok) {
    const from = `(${piece.row},${piece.col})`;
    const options = legal.map((d) => `(${d.row},${d.col})`).join(', ') || '(none)';
    throw new Error(
      `Piece ${pieceId} at ${from} cannot move to (${toRow},${toCol}). Legal destinations for it: ${options}.`,
    );
  }

  return { type: 'move', pieceId: piece.id, toRow, toCol };
}

/** Model-facing hint appended to a rejected tool result. */
export function toolResultHint(error: string): string | undefined {
  if (error.includes('not yours')) {
    return 'Only pieces marked M (yours) can be moved. Board and turn are unchanged.';
  }
  if (error.includes('no piece with id')) {
    return 'Copy an id exactly as shown in the legal-move list — do not invent or renumber.';
  }
  return 'Pick one entry from the legal-move list in the first user message. Board and turn are unchanged.';
}

/** Extra nudge on retry. */
export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  return (
    `Attempt ${context.priorTurns.length + 1} rejected: ${context.lastRejection} ` +
    'Re-read the legal-move list and submit a different entry from it.'
  );
}

/** Player-facing note while the AI is thinking. */
export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal move — ${error}`;
}
