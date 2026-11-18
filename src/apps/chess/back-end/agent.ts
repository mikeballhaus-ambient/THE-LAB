import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty } from '@/shared/game-platform/types';
import {
  agentDifficultyLine,
  buildAgentSystemPrompt,
} from '@/shared/game-platform/difficulty-policy';
import { CHESS_SUBMIT_MOVE_TOOL_ID, ChessAgentMoveSchema } from '../shared/chess-agent-move-schema';
import {
  CHESS_AGENT_STRATEGY_BY_TIER,
  CHESS_STRATEGY_CORE,
  CHESS_USER_TURN_CHECKLIST,
} from './chess-agent-strategy';
import { buildChessSearchAdvisory } from './chess-search';
import {
  CHESS_BOARD_SIZE,
  chessStatus,
  isLegalMove,
  legalMovesFrom,
  normalizeChessState,
  pieceAt,
  squareName,
  type ChessColor,
  type ChessMatchState,
  type ChessPiece,
  type ChessPieceType,
  type ChessSquare,
} from './rules';
import { agentTurnMark, agentTurnPhaseDebug } from '@/shared/utils/agent-stream-debug.node';

/**
 * Chess's agent surface: prompt construction and move grading.
 *
 * A model cannot play chess well from a board diagram alone — it needs the legal
 * move list. So the prompt enumerates every legal move in `from-to` form and the
 * grader rejects anything absent from it, naming what was wrong.
 */

const TIER_TIPS: Record<GameDifficulty, string> = {
  easy: 'Play safe, simple, readable moves. Avoid sharp lines.',
  medium: 'Play solid fundamentals. Take free material, avoid obvious blunders.',
  hard: 'Play competitively. Prefer forcing moves and better positions.',
  boss: 'Play near-optimally. Punish every mistake.',
};

const AGENT_ROLE = 'You are a Chess opponent on an 8x8 board.';

const TOOL_CONTRACT = `OUTPUT CONTRACT (required every turn):
- Call the tool \`${CHESS_SUBMIT_MOVE_TOOL_ID}\` exactly once with
  {"fromRow": r, "fromCol": c, "toRow": r, "toCol": c, "promotion"?: "queen"|"rook"|"bishop"|"knight"}.
- Put the move ONLY in the tool arguments — never in assistant text.
- Row 0 is rank 8 (Black's back rank), row 7 is rank 1 (White's back rank).
- Column 0 is file a, column 7 is file h.
- Do NOT use chess rank numbers as row indices (rank 2 is row 6, not row 2).
- Copy fromRow/fromCol/toRow/toCol exactly from the legal-move list — each entry includes them.
- You MUST choose from the legal-move list below — nothing else will be accepted.
- LOCAL SEARCH HINTS (when present) rank strong lines — you still decide which legal move to submit.
- Include "promotion" only when a pawn reaches the last rank.
- If a previous attempt was rejected, the reason is given below — do not repeat it.`;

function pieceLetter(piece: ChessPiece | null): string {
  if (!piece) {
    return '.';
  }
  const letter = piece.type === 'knight' ? 'n' : piece.type[0]!;
  return piece.color === 'white' ? letter.toUpperCase() : letter;
}

/** 8x8 render with algebraic labels. */
export function renderBoard(pieces: readonly ChessPiece[]): string {
  const lines: string[] = ['     a b c d e f g h'];
  for (let r = 0; r < CHESS_BOARD_SIZE; r += 1) {
    const cells: string[] = [];
    for (let c = 0; c < CHESS_BOARD_SIZE; c += 1) {
      cells.push(pieceLetter(pieceAt(pieces, r, c)));
    }
    lines.push(`  ${CHESS_BOARD_SIZE - r}  ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

/** Every legal move with algebraic label and exact tool coordinates. */
export function legalMoveList(pieces: readonly ChessPiece[], color: ChessColor): string[] {
  const out: string[] = [];
  for (const piece of pieces) {
    if (piece.color !== color) {
      continue;
    }
    for (const to of legalMovesFrom(pieces, color, { row: piece.row, col: piece.col })) {
      const base = `${squareName(piece.row, piece.col)}-${squareName(to.row, to.col)}`;
      const promoting =
        piece.type === 'pawn' &&
        (to.row === 0 || to.row === CHESS_BOARD_SIZE - 1);
      const label = promoting ? `${base}=Q` : base;
      const coords =
        `fromRow:${piece.row},fromCol:${piece.col},toRow:${to.row},toCol:${to.col}` +
        (promoting ? ',promotion:queen' : '');
      out.push(`${label} | ${coords}`);
    }
  }
  return out;
}

export function buildUserPrompt(
  state: ChessMatchState | readonly ChessPiece[],
  seat: number,
  difficulty: GameDifficulty,
  options?: { lastRejection?: string },
): string {
  const promptElapsed = agentTurnMark();
  const pieces = normalizeChessState(state).pieces;
  const color: ChessColor = seat === 1 ? 'white' : 'black';
  const opponent: ChessColor = color === 'white' ? 'black' : 'white';
  const legalElapsed = agentTurnMark();
  const legal = legalMoveList(pieces, color);
  const legalMoveListMs = legalElapsed();
  const status = chessStatus(pieces, color);
  const myPieces = pieces.filter((p) => p.color === color).length;
  const theirPieces = pieces.filter((p) => p.color === opponent).length;

  const lines = [
    agentDifficultyLine(difficulty, TIER_TIPS),
    '',
    `You are ${color} (seat ${seat}). Your opponent is ${opponent}.`,
    `Material: you have ${myPieces} pieces, opponent has ${theirPieces}.`,
    '',
    'Board (uppercase = White, lowercase = Black, . = empty):',
    renderBoard(pieces),
  ];

  if (status.inCheck) {
    lines.push('', 'YOU ARE IN CHECK — you must address the check this move.');
  }
  if (status.finished) {
    lines.push(
      '',
      status.stalemate ? 'You are STALEMATED — no legal move exists.' : 'You are CHECKMATED — no legal move exists.',
    );
  }

  const advisory = buildChessSearchAdvisory(normalizeChessState(state), seat, difficulty);
  if (advisory) {
    lines.push('', advisory);
  }

  lines.push(
    '',
    `Legal moves (${legal.length}) — copy the fromRow/fromCol/toRow/toCol from one line:`,
    legal.length ? legal.join('\n') : '(none)',
  );

  if (options?.lastRejection) {
    lines.push('', `Your previous attempt was REJECTED: ${options.lastRejection}`);
    lines.push('Choose a different entry from the legal-move list above.');
  }

  const checklist =
    difficulty === 'hard' || difficulty === 'boss'
      ? CHESS_USER_TURN_CHECKLIST[difficulty]
      : undefined;
  if (checklist) {
    lines.push('', checklist);
  }

  lines.push('', TOOL_CONTRACT);
  const prompt = lines.join('\n');
  agentTurnPhaseDebug('chessBuildUserPrompt', {
    difficulty,
    legalMoveCount: legal.length,
    legalMoveListMs,
    totalMs: promptElapsed(),
    promptChars: prompt.length,
  });
  return prompt;
}

/** Assembled system prompt for a tier. */
export function buildSystemPrompt(difficulty: GameDifficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${AGENT_ROLE}\n\n${TOOL_CONTRACT}\n\n${CHESS_STRATEGY_CORE}`,
    difficulty,
    gameMechanicsByTier: CHESS_AGENT_STRATEGY_BY_TIER,
  });
}

/** Grade a move; throws with a model-facing reason when illegal. */
export function gradeAgentMove(
  raw: unknown,
  state: ChessMatchState | readonly ChessPiece[],
  seat: number,
): { from: ChessSquare; to: ChessSquare; promotion?: ChessPieceType } {
  const pieces = normalizeChessState(Array.isArray(state) ? state : state).pieces;
  const parsed = ChessAgentMoveSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Invalid arguments: ${issue?.message ?? 'expected {"fromRow","fromCol","toRow","toCol"} each 0-7.'}`,
    );
  }
  const { fromRow, fromCol, toRow, toCol, promotion } = parsed.data;
  const color: ChessColor = seat === 1 ? 'white' : 'black';

  const status = chessStatus(pieces, color);
  if (status.finished) {
    throw new Error(
      status.stalemate
        ? 'The game is over (stalemate) — no legal move exists.'
        : 'The game is over (checkmate) — no legal move exists.',
    );
  }

  const from = { row: fromRow, col: fromCol };
  const to = { row: toRow, col: toCol };
  const piece = pieceAt(pieces, fromRow, fromCol);
  if (!piece) {
    throw new Error(
      `There is no piece on ${squareName(fromRow, fromCol)}. Pick a move from the legal-move list.`,
    );
  }
  if (piece.color !== color) {
    throw new Error(
      `${squareName(fromRow, fromCol)} holds a ${piece.color} ${piece.type}, not yours. You are ${color}.`,
    );
  }
  if (!isLegalMove(pieces, color, from, to)) {
    const options = legalMovesFrom(pieces, color, from).map((d) => squareName(d.row, d.col));
    throw new Error(
      `Illegal move ${squareName(fromRow, fromCol)}-${squareName(toRow, toCol)} for that ${piece.type}. ` +
        `That piece can legally reach: ${options.length ? options.join(', ') : '(nowhere)'}.`,
    );
  }
  return { from, to, promotion: promotion ?? undefined };
}

/** Model-facing hint appended to a rejected tool result. */
export function toolResultHint(error: string): string | undefined {
  if (error.includes('not yours')) {
    return 'You may only move your own pieces. Board and turn are unchanged.';
  }
  if (error.includes('no piece')) {
    return 'The origin square is empty. Use a move copied from the legal-move list.';
  }
  if (error.includes('already over')) {
    return 'The game has ended; no move is possible.';
  }
  return 'Pick one entry from the legal-move list in the first user message — those are the only accepted moves.';
}

/** Extra nudge on retry. */
export function retryUserHint(context: {
  lastRejection: string;
  priorTurns: readonly PlatformLlmToolFeedbackTurn[];
}): string {
  return (
    `Attempt ${context.priorTurns.length + 1} rejected: ${context.lastRejection} ` +
    'Copy a different entry verbatim from the legal-move list.'
  );
}

/** Player-facing note while the AI is thinking. */
export function attemptNote(_toolArguments: string, error: string): string {
  return `Tried an illegal move — ${error}`;
}
