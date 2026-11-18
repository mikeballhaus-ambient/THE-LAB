import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import { withCatalogMatchWager } from '@/shared/game-platform/catalog-match-wager';
import { DEFAULT_AGENT_LLM_SAMPLING, agentTemperature } from '@/shared/game-platform/difficulty-policy';
import type { GameServerAdapter } from '@/shared/game-platform/types';
import { CHESS_SUBMIT_MOVE_TOOL_ID } from '../shared/chess-agent-move-schema';
import {
  attemptNote,
  buildSystemPrompt,
  buildUserPrompt,
  gradeAgentMove,
  retryUserHint,
  toolResultHint,
} from './agent';
import { CHESS_GAME_IDS } from './catalog';
import {
  applyChessMove,
  chessStatus,
  createInitialPieces,
  isLegalMove,
  normalizeChessState,
  summarizeChessMove,
  type ChessColor,
  type ChessMatchState,
  type ChessPiece,
  type ChessPieceType,
  type ChessSquare,
} from './rules';

const PURPOSE = 'chess.chess.agent-turn';
const MAX_TURN_HISTORY = 100;

const PROMOTION_TYPES = new Set<ChessPieceType>(['queen', 'rook', 'bishop', 'knight']);

const SYSTEM_PROMPT = `You are a chess opponent. Reply with ONLY a move in the form
"fromRow,fromCol-toRow,toCol" using 0-based coordinates where row 0 is Black's
back rank and row 7 is White's back rank. Example: "6,4-4,4". Do not explain.`;

interface ChessMove {
  from: ChessSquare;
  to: ChessSquare;
  promotion?: ChessPieceType;
}

const SQUARE_RE = /(\d)\s*,\s*(\d)\s*-\s*(\d)\s*,\s*(\d)/;

function parsePromotion(raw: unknown): ChessPieceType | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  return PROMOTION_TYPES.has(raw as ChessPieceType) ? (raw as ChessPieceType) : undefined;
}

function parseChessMove(move: unknown): ChessMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as Record<string, unknown>;

  if (typeof m.fromRow === 'number' || typeof m.fromRow === 'string') {
    const fromRow = Number(m.fromRow);
    const fromCol = Number(m.fromCol);
    const toRow = Number(m.toRow);
    const toCol = Number(m.toCol);
    if ([fromRow, fromCol, toRow, toCol].some((n) => !Number.isInteger(n) || n < 0 || n > 7)) {
      return null;
    }
    const promotion = parsePromotion(m.promotion);
    return {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      promotion,
    };
  }

  const f = m.from as { row?: unknown; col?: unknown } | undefined;
  const t = m.to as { row?: unknown; col?: unknown } | undefined;
  const nums = [f?.row, f?.col, t?.row, t?.col].map((v) => Number(v));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 7)) return null;
  return {
    from: { row: nums[0] as number, col: nums[1] as number },
    to: { row: nums[2] as number, col: nums[3] as number },
    promotion: parsePromotion(m.promotion),
  };
}

function colorForSeat(seat: number): ChessColor {
  return seat === 1 ? 'white' : 'black';
}

function piecesOf(state: ChessMatchState | ChessPiece[]): ChessPiece[] {
  return normalizeChessState(state).pieces;
}

/** Prose fallback parser for providers that ignore the structural tool. */
function parseAgentReply(
  content: string,
  state: ChessMatchState | ChessPiece[],
  seat: number,
): ChessMove | null {
  const pieces = piecesOf(state);
  const color = colorForSeat(seat);
  const match = SQUARE_RE.exec(content);
  if (!match) return null;
  const [r1, c1, r2, c2] = match.slice(1).map((n) => Number(n));
  const from = { row: r1 as number, col: c1 as number };
  const to = { row: r2 as number, col: c2 as number };
  return isLegalMove(pieces, color, from, to) ? { from, to } : null;
}

const chessAdapterCore = createTurnBasedAdapter<ChessMatchState, ChessMove>({
  gameId: CHESS_GAME_IDS.CHESS,
  rules: {
    createInitialState: () => ({
      pieces: createInitialPieces(),
      turnHistory: [],
    }),
    parseMove: (move) => parseChessMove(move),
    validate: (state, move, seat) => {
      const pieces = piecesOf(state);
      const color = colorForSeat(seat);
      const status = chessStatus(pieces, color);
      if (status.finished) return { ok: false, error: 'Match is already finished' };
      return isLegalMove(pieces, color, move.from, move.to)
        ? { ok: true }
        : { ok: false, error: 'Illegal chess move' };
    },
    apply: (state, move, playerSeat) => {
      const normalized = normalizeChessState(state);
      const pieces = applyChessMove(
        normalized.pieces,
        move.from,
        move.to,
        move.promotion,
      );
      const summary = summarizeChessMove(
        normalized.pieces,
        move.from,
        move.to,
        move.promotion,
      );
      const turnHistory = [...(normalized.turnHistory ?? []), { seat: playerSeat, summary }].slice(
        -MAX_TURN_HISTORY,
      );
      return { pieces, turnHistory };
    },
    scores: (state) => {
      const pieces = piecesOf(state);
      return {
        1: pieces.filter((p) => p.color === 'white').length,
        2: pieces.filter((p) => p.color === 'black').length,
      };
    },
    isFinished: (state) => {
      const pieces = piecesOf(state);
      const white = chessStatus(pieces, 'white').finished;
      const black = chessStatus(pieces, 'black').finished;
      return white || black;
    },
    winnerSeat: (state) => {
      const pieces = piecesOf(state);
      const w = chessStatus(pieces, 'white');
      if (w.finished && w.winner) {
        return pieces.find((p) => p.id === w.winner)?.color === 'black' ? 2 : 1;
      }
      const b = chessStatus(pieces, 'black');
      if (b.finished && b.winner) {
        return pieces.find((p) => p.id === b.winner)?.color === 'black' ? 2 : 1;
      }
      return null;
    },
    onTimeout: (state, playerSeat) => {
      const normalized = normalizeChessState(state);
      return {
        ...normalized,
        turnHistory: [
          ...(normalized.turnHistory ?? []),
          { seat: playerSeat, summary: 'Turn timed out' },
        ].slice(-MAX_TURN_HISTORY),
      };
    },
    summarizeMove: (move) => {
      const promo = move.promotion ? `=${move.promotion[0]?.toUpperCase()}` : '';
      return `${move.from.row},${move.from.col}→${move.to.row},${move.to.col}${promo}`;
    },
  },
  agent: {
    purpose: PURPOSE,
    systemPrompt: SYSTEM_PROMPT,
    systemPromptFor: (difficulty) => buildSystemPrompt(difficulty),
    buildUserPrompt: (state, seat, difficulty, retry) =>
      buildUserPrompt(state, seat, difficulty, { lastRejection: retry?.lastRejection }),
    parseAgentReply: (content, state, seat) => parseAgentReply(content, state, seat),
    temperatureFor: agentTemperature,

    structuralTool: {
      id: CHESS_SUBMIT_MOVE_TOOL_ID,
      sampling: DEFAULT_AGENT_LLM_SAMPLING,
      grade: (raw, state, seat) => gradeAgentMove(raw, state, seat),
      toolResultHint,
      retryUserHint,
      attemptNote,
      limits: { maxApiRounds: 8, maxStructuralRounds: 3, feedbackWindow: 4 },
    },
  },
});

export const chessAdapter: GameServerAdapter = withCatalogMatchWager(chessAdapterCore, {
  gameLabel: 'Chess',
});

export type { ChessPiece };
