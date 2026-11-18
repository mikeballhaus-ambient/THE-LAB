/**
 * Checkers (draughts) rules — pure, framework-free.
 *
 * Shared by the app server adapter and the board UI (legal-move hints).
 */
export const BOARD_SIZE = 8;

export type CheckersColor = 1 | 2;

export interface CheckersPiece {
  id: number;
  row: number;
  col: number;
  color: CheckersColor;
  isKing: boolean;
}

export interface CheckersTurnHistoryEntry {
  seat: number;
  summary: string;
}

export interface CheckersState {
  pieces: CheckersPiece[];
  currentSeat: CheckersColor;
  winnerSeat: number | null;
  finished: boolean;
  moveCount: number;
  turnHistory?: CheckersTurnHistoryEntry[];
  /** When set, the same seat must continue jumping with this piece. */
  jumpChainPieceId?: number | null;
}

const MAX_TURN_HISTORY = 100;

export interface CheckersMove {
  type: 'move';
  pieceId: number;
  toRow: number;
  toCol: number;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function pieceAt(
  pieces: readonly CheckersPiece[],
  row: number,
  col: number,
): CheckersPiece | null {
  return pieces.find((p) => p.row === row && p.col === col) ?? null;
}

export function createInitialState(): CheckersState {
  const pieces: CheckersPiece[] = [];
  let id = 1;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        pieces.push({ id: id++, row, col, color: 2, isKing: false });
      }
    }
  }
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        pieces.push({ id: id++, row, col, color: 1, isKing: false });
      }
    }
  }
  return {
    pieces,
    currentSeat: 1,
    winnerSeat: null,
    finished: false,
    moveCount: 0,
    turnHistory: [],
    jumpChainPieceId: null,
  };
}

export function summarizeCheckersMove(state: CheckersState, move: CheckersMove): string {
  const piece = state.pieces.find((p) => p.id === move.pieceId);
  if (!piece) {
    return `Moved piece ${move.pieceId} to (${move.toRow}, ${move.toCol})`;
  }
  const capture = captureDestinations(state.pieces, piece).find(
    (c) => c.row === move.toRow && c.col === move.toCol,
  );
  const crowned =
    !piece.isKing && (move.toRow === 0 || move.toRow === BOARD_SIZE - 1) ? ', crowned' : '';
  if (capture) {
    return `Captured with piece ${move.pieceId} to (${move.toRow}, ${move.toCol})${crowned}`;
  }
  return `Moved piece ${move.pieceId} to (${move.toRow}, ${move.toCol})${crowned}`;
}

function forwardDelta(color: CheckersColor): number {
  return color === 1 ? -1 : 1;
}

export function simpleDestinations(
  pieces: readonly CheckersPiece[],
  piece: CheckersPiece,
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const deltas = piece.isKing ? [-1, 1] : [forwardDelta(piece.color)];
  for (const dr of deltas) {
    for (const dc of [-1, 1]) {
      const row = piece.row + dr;
      const col = piece.col + dc;
      if (!inBounds(row, col)) continue;
      if (pieceAt(pieces, row, col)) continue;
      out.push({ row, col });
    }
  }
  return out;
}

export function captureDestinations(
  pieces: readonly CheckersPiece[],
  piece: CheckersPiece,
): { row: number; col: number; capturedId: number }[] {
  const out: { row: number; col: number; capturedId: number }[] = [];
  const deltas = piece.isKing ? [-1, 1] : [forwardDelta(piece.color)];
  for (const dr of deltas) {
    for (const dc of [-1, 1]) {
      const midRow = piece.row + dr;
      const midCol = piece.col + dc;
      const row = piece.row + dr * 2;
      const col = piece.col + dc * 2;
      if (!inBounds(row, col)) continue;
      const victim = pieceAt(pieces, midRow, midCol);
      if (!victim || victim.color === piece.color) continue;
      if (pieceAt(pieces, row, col)) continue;
      out.push({ row, col, capturedId: victim.id });
    }
  }
  return out;
}

export function hasCaptureAvailable(
  pieces: readonly CheckersPiece[],
  color: CheckersColor,
): boolean {
  return pieces
    .filter((p) => p.color === color)
    .some((p) => captureDestinations(pieces, p).length > 0);
}

export function parseMove(move: unknown): CheckersMove | null {
  if (!move || typeof move !== 'object') return null;
  const m = move as { pieceId?: unknown; toRow?: unknown; toCol?: unknown };
  const pieceId = Number(m.pieceId);
  const toRow = Number(m.toRow);
  const toCol = Number(m.toCol);
  if (!Number.isInteger(pieceId) || pieceId <= 0) return null;
  if (!inBounds(toRow, toCol)) return null;
  return { type: 'move', pieceId, toRow, toCol };
}

export function validateMove(
  state: CheckersState,
  move: CheckersMove,
  playerSeat: number,
): { ok: true } | { ok: false; error: string } {
  if (state.finished) return { ok: false, error: 'Match is already finished' };
  if (playerSeat !== state.currentSeat) {
    return { ok: false, error: `Not seat ${playerSeat}'s turn` };
  }
  const piece = state.pieces.find((p) => p.id === move.pieceId);
  if (!piece) return { ok: false, error: 'No such piece' };
  if (piece.color !== state.currentSeat) {
    return { ok: false, error: 'That piece belongs to the opponent' };
  }

  if (state.jumpChainPieceId != null) {
    if (move.pieceId !== state.jumpChainPieceId) {
      return { ok: false, error: 'Continue the jump with the same piece' };
    }
    const chainCaptures = captureDestinations(state.pieces, piece);
    if (!chainCaptures.some((c) => c.row === move.toRow && c.col === move.toCol)) {
      return { ok: false, error: 'Must jump again to capture' };
    }
    return { ok: true };
  }

  const captures = captureDestinations(state.pieces, piece);
  if (captures.some((c) => c.row === move.toRow && c.col === move.toCol)) {
    return { ok: true };
  }

  const simple = simpleDestinations(state.pieces, piece);
  const ok = simple.some((d) => d.row === move.toRow && d.col === move.toCol);
  return ok ? { ok: true } : { ok: false, error: 'Illegal checkers move' };
}

export function applyTurnTimeout(state: CheckersState, playerSeat: number): CheckersState {
  const nextSeat: CheckersColor = playerSeat === 1 ? 2 : 1;
  return {
    ...state,
    currentSeat: nextSeat,
    jumpChainPieceId: null,
    turnHistory: [
      ...(state.turnHistory ?? []),
      { seat: playerSeat, summary: 'Turn timed out' },
    ].slice(-MAX_TURN_HISTORY),
  };
}

export function applyMove(
  state: CheckersState,
  move: CheckersMove,
  playerSeat: number = state.currentSeat,
): CheckersState {
  const piece = state.pieces.find((p) => p.id === move.pieceId);
  if (!piece) return state;

  const summary = summarizeCheckersMove(state, move);
  const capture = captureDestinations(state.pieces, piece).find(
    (c) => c.row === move.toRow && c.col === move.toCol,
  );

  const pieces = state.pieces
    .filter((p) => (capture ? p.id !== capture.capturedId : true))
    .map((p) => {
      if (p.id !== piece.id) return p;
      const promoted = !p.isKing && (move.toRow === 0 || move.toRow === BOARD_SIZE - 1);
      return { ...p, row: move.toRow, col: move.toCol, isKing: p.isKing || promoted };
    });

  const movedPiece = pieces.find((p) => p.id === piece.id)!;
  let jumpChainPieceId: number | null = null;
  let nextSeat: CheckersColor = state.currentSeat === 1 ? 2 : 1;

  if (capture && captureDestinations(pieces, movedPiece).length > 0) {
    jumpChainPieceId = movedPiece.id;
    nextSeat = state.currentSeat;
  }

  let winnerSeat: number | null = null;
  if (pieces.filter((p) => p.color !== state.currentSeat).length === 0) {
    winnerSeat = state.currentSeat;
  } else if (jumpChainPieceId == null) {
    const opponentSeat = nextSeat;
    const pseudo: CheckersState = {
      pieces,
      currentSeat: opponentSeat,
      winnerSeat: null,
      finished: false,
      moveCount: state.moveCount,
      jumpChainPieceId: null,
    };
    const opponentCanMove = pieces
      .filter((p) => p.color === opponentSeat)
      .some((p) => legalMovesFor(pseudo, p).length > 0);
    if (!opponentCanMove) {
      winnerSeat = state.currentSeat;
    }
  }

  const turnHistory = [...(state.turnHistory ?? []), { seat: playerSeat, summary }].slice(
    -MAX_TURN_HISTORY,
  );

  return {
    pieces,
    currentSeat: nextSeat,
    winnerSeat,
    finished: winnerSeat !== null,
    moveCount: state.moveCount + 1,
    turnHistory,
    jumpChainPieceId,
  };
}

export function legalMovesFor(
  state: CheckersState,
  piece: CheckersPiece,
): { row: number; col: number }[] {
  if (state.jumpChainPieceId != null) {
    if (piece.id !== state.jumpChainPieceId) {
      return [];
    }
    return captureDestinations(state.pieces, piece).map((c) => ({
      row: c.row,
      col: c.col,
    }));
  }

  const captures = captureDestinations(state.pieces, piece).map((c) => ({
    row: c.row,
    col: c.col,
  }));
  const simple = simpleDestinations(state.pieces, piece);
  const seen = new Set<string>();
  const out: { row: number; col: number }[] = [];
  for (const d of [...captures, ...simple]) {
    const key = `${d.row},${d.col}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(d);
  }
  return out;
}
