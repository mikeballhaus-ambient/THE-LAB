import type { MatchView } from '@/shared/game-platform/types';
import { readMatchTurnHistory } from '@/shared/game-platform/use-turn-based-match';
import type { LabAssistantBanterMoment } from '@/shared/game-platform/lab-assistant-banter/types';
import { detectMatchEndBanterMoment } from '@/shared/game-platform/lab-assistant-banter/match-end-moment';
import {
  chessStatus,
  normalizeChessState,
  type ChessColor,
  type ChessMatchState,
  type ChessPiece,
} from './chess-rules';

function opponentColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

function seatToColor(seat: number): ChessColor {
  return seat === 1 ? 'white' : 'black';
}

function pieceCount(pieces: readonly ChessPiece[], color: ChessColor): number {
  return pieces.filter((p) => p.color === color).length;
}

function capturedOnLastMove(prev: ChessMatchState, next: ChessMatchState, moverSeat: number): boolean {
  const victimColor = opponentColor(seatToColor(moverSeat));
  return pieceCount(next.pieces, victimColor) < pieceCount(prev.pieces, victimColor);
}

function highestCaptureDetail(prev: ChessMatchState, next: ChessMatchState, moverSeat: number): string | undefined {
  const victimColor = opponentColor(seatToColor(moverSeat));
  const missing = prev.pieces.filter((p) => p.color === victimColor && !next.pieces.some((n) => n.id === p.id));
  if (missing.length === 0) {
    return undefined;
  }
  const order: Record<string, number> = { queen: 5, rook: 4, bishop: 3, knight: 2, pawn: 1, king: 0 };
  missing.sort((a, b) => (order[b.type] ?? 0) - (order[a.type] ?? 0));
  return missing[0]?.type;
}

function detectChessMidGame(prev: MatchView | null, next: MatchView): LabAssistantBanterMoment | null {
  if (!prev || next.status !== 'active') {
    return null;
  }

  const prevState = normalizeChessState(prev.state as ChessMatchState | ChessPiece[]);
  const nextState = normalizeChessState(next.state as ChessMatchState | ChessPiece[]);
  const history = readMatchTurnHistory(next.state);
  const prevHistoryLen = readMatchTurnHistory(prev.state).length;
  if (history.length <= prevHistoryLen) {
    return null;
  }

  const last = history[history.length - 1]!;
  const moverSeat = last.seat;

  const toMoveColor = seatToColor(next.currentSeat);
  if (chessStatus(nextState.pieces, toMoveColor).inCheck) {
    return { kind: 'check', moverSeat };
  }

  if (capturedOnLastMove(prevState, nextState, moverSeat)) {
    return {
      kind: 'capture',
      moverSeat,
      detail: highestCaptureDetail(prevState, nextState, moverSeat),
    };
  }

  const summary = last.summary.toLowerCase();
  if (summary.includes('x') || summary.includes('capture') || summary.includes('take')) {
    return { kind: 'capture', moverSeat, detail: highestCaptureDetail(prevState, nextState, moverSeat) };
  }

  return null;
}

/**
 * Detect a single banter moment after an authoritative chess match update.
 * Priority: match end > check > capture.
 */
export function detectChessBanterMoment(
  prev: MatchView | null,
  next: MatchView,
): LabAssistantBanterMoment | null {
  if (next.opponentKind !== 'ai') {
    return null;
  }
  return detectMatchEndBanterMoment(prev, next) ?? detectChessMidGame(prev, next);
}
