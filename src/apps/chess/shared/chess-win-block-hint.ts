import {
  applyChessMove,
  CHESS_BOARD_SIZE,
  chessStatus,
  legalMovesFrom,
  opponentOf,
  pieceAt,
  type ChessColor,
  type ChessPiece,
  type ChessSquare,
  type ChessTurnHistoryEntry,
} from './chess-rules';

export type ChessQuarksHintKind = 'win' | 'block-mate' | 'block-capture' | 'capture' | 'suggest';

export interface ChessQuarksHint {
  from: ChessSquare;
  to: ChessSquare;
  kind: ChessQuarksHintKind;
}

export interface ChessWinBlockHint {
  from: ChessSquare;
  to: ChessSquare;
  kind: 'win' | 'block-mate' | 'block-capture';
}

export interface ChessQuarksHintOptions {
  /** Match seat (1 = white, 2 = black) — used to read your recent plies from history. */
  yourSeat?: number;
  turnHistory?: ChessTurnHistoryEntry[];
}

function parseSquareName(name: string): ChessSquare | null {
  const m = /^([a-h])([1-8])$/i.exec(name.trim());
  if (!m) {
    return null;
  }
  const col = m[1]!.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = Number(m[2]);
  if (!Number.isInteger(rank) || rank < 1 || rank > 8) {
    return null;
  }
  return { row: CHESS_BOARD_SIZE - rank, col };
}

/** Parses summaries like `c1→f4` or `e2→e4 (captures pawn)`. */
export function parseChessTurnSummaryMove(
  summary: string,
): { from: ChessSquare; to: ChessSquare } | null {
  const head = summary.split(' ')[0] ?? summary;
  const m = /^([a-h][1-8])→([a-h][1-8])$/i.exec(head);
  if (!m) {
    return null;
  }
  const from = parseSquareName(m[1]!);
  const to = parseSquareName(m[2]!);
  if (!from || !to) {
    return null;
  }
  return { from, to };
}

function recentMovesForSeat(
  turnHistory: ChessTurnHistoryEntry[] | undefined,
  seat: number,
  limit: number,
): { from: ChessSquare; to: ChessSquare }[] {
  if (!turnHistory?.length || seat !== 1 && seat !== 2) {
    return [];
  }
  const out: { from: ChessSquare; to: ChessSquare }[] = [];
  for (let i = turnHistory.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const entry = turnHistory[i]!;
    if (entry.seat !== seat) {
      continue;
    }
    const parsed = parseChessTurnSummaryMove(entry.summary);
    if (parsed) {
      out.push(parsed);
    }
  }
  return out;
}

function squaresEqual(a: ChessSquare, b: ChessSquare): boolean {
  return a.row === b.row && a.col === b.col;
}

function isUndoOfLastOurMove(
  from: ChessSquare,
  to: ChessSquare,
  recentOurMoves: { from: ChessSquare; to: ChessSquare }[],
): boolean {
  const last = recentOurMoves[0];
  if (!last) {
    return false;
  }
  return squaresEqual(from, last.to) && squaresEqual(to, last.from);
}

function countMobility(pieces: readonly ChessPiece[], color: ChessColor): number {
  let n = 0;
  for (const p of pieces) {
    if (p.color !== color) {
      continue;
    }
    n += legalMovesFrom(pieces, color, { row: p.row, col: p.col }).length;
  }
  return n;
}

function mateDelivered(pieces: readonly ChessPiece[], mover: ChessColor): boolean {
  const st = chessStatus(pieces, opponentOf(mover));
  return st.finished && st.inCheck && !st.stalemate && st.winner != null;
}

function iterLegalMoves(
  pieces: readonly ChessPiece[],
  color: ChessColor,
): { from: ChessSquare; to: ChessSquare }[] {
  const out: { from: ChessSquare; to: ChessSquare }[] = [];
  for (const p of pieces.filter((x) => x.color === color)) {
    const from = { row: p.row, col: p.col };
    for (const to of legalMovesFrom(pieces, color, from)) {
      out.push({ from, to });
    }
  }
  return out;
}

const PIECE_VALUE: Record<string, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100,
};

function isCapture(pieces: readonly ChessPiece[], color: ChessColor, to: ChessSquare): boolean {
  const victim = pieceAt(pieces, to.row, to.col);
  return Boolean(victim && victim.color === opponentOf(color));
}

function captureValue(pieces: readonly ChessPiece[], to: ChessSquare): number {
  const victim = pieceAt(pieces, to.row, to.col);
  if (!victim) {
    return 0;
  }
  return PIECE_VALUE[victim.type] ?? 0;
}

function pieceMaterialValue(piece: ChessPiece): number {
  return PIECE_VALUE[piece.type] ?? 0;
}

/** Opponent can legally capture on `square` next ply (our piece landed there). */
function opponentCanCaptureSquare(
  piecesAfterOurMove: readonly ChessPiece[],
  color: ChessColor,
  square: ChessSquare,
): boolean {
  const opp = opponentOf(color);
  const occupant = pieceAt(piecesAfterOurMove, square.row, square.col);
  if (!occupant || occupant.color !== color) {
    return false;
  }
  for (const { to } of iterLegalMoves(piecesAfterOurMove, opp)) {
    if (to.row === square.row && to.col === square.col) {
      return true;
    }
  }
  return false;
}

/**
 * Material won if we capture now and the opponent cannot immediately recapture on that square.
 * One ply only (hints, not search).
 */
function onePlyCaptureNet(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  from: ChessSquare,
  to: ChessSquare,
): number {
  const victimVal = captureValue(pieces, to);
  if (victimVal <= 0) {
    return 0;
  }
  const mover = pieceAt(pieces, from.row, from.col);
  if (!mover) {
    return victimVal;
  }
  const after = applyChessMove(pieces, from, to);
  if (!opponentCanCaptureSquare(after, color, to)) {
    return victimVal;
  }
  return victimVal - pieceMaterialValue(mover);
}

function pickBestCapture(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  moves: { from: ChessSquare; to: ChessSquare }[],
): ChessQuarksHint | null {
  let best: ChessQuarksHint | null = null;
  let bestNet = Number.NEGATIVE_INFINITY;
  let bestVictim = 0;
  for (const { from, to } of moves) {
    const net = onePlyCaptureNet(pieces, color, from, to);
    if (net < 0) {
      continue;
    }
    const victimVal = captureValue(pieces, to);
    if (
      net > bestNet ||
      (net === bestNet && victimVal > bestVictim) ||
      (net === bestNet &&
        victimVal === bestVictim &&
        best &&
        (from.row < best.from.row ||
          (from.row === best.from.row && from.col < best.from.col)))
    ) {
      bestNet = net;
      bestVictim = victimVal;
      best = { from, to, kind: 'capture' };
    }
  }
  return best;
}

function opponentCaptureThreatScore(pieces: readonly ChessPiece[], color: ChessColor): number {
  const opp = opponentOf(color);
  let best = 0;
  for (const { to } of iterLegalMoves(pieces, opp)) {
    const victim = pieceAt(pieces, to.row, to.col);
    if (!victim || victim.color !== color) {
      continue;
    }
    best = Math.max(best, PIECE_VALUE[victim.type] ?? 0);
  }
  return best;
}

function findWinHint(pieces: readonly ChessPiece[], color: ChessColor): ChessQuarksHint | null {
  for (const { from, to } of iterLegalMoves(pieces, color)) {
    const next = applyChessMove(pieces, from, to);
    if (mateDelivered(next, color)) {
      return { from, to, kind: 'win' };
    }
  }
  return null;
}

function findBlockMateHint(pieces: readonly ChessPiece[], color: ChessColor): ChessQuarksHint | null {
  const opp = opponentOf(color);
  const oppMating = iterLegalMoves(pieces, opp).filter(({ from, to }) =>
    mateDelivered(applyChessMove(pieces, from, to), opp),
  );
  if (oppMating.length === 0) {
    return null;
  }
  for (const { from, to } of iterLegalMoves(pieces, color)) {
    const next = applyChessMove(pieces, from, to);
    const stillMate = iterLegalMoves(next, opp).some(({ from: f, to: t }) =>
      mateDelivered(applyChessMove(next, f, t), opp),
    );
    if (!stillMate) {
      return { from, to, kind: 'block-mate' };
    }
  }
  return null;
}

function findBestCaptureHint(pieces: readonly ChessPiece[], color: ChessColor): ChessQuarksHint | null {
  const captures = iterLegalMoves(pieces, color).filter(({ to }) =>
    isCapture(pieces, color, to),
  );
  return pickBestCapture(pieces, color, captures);
}

function findBlockOpponentCaptureHint(
  pieces: readonly ChessPiece[],
  color: ChessColor,
): ChessQuarksHint | null {
  const baseline = opponentCaptureThreatScore(pieces, color);
  if (baseline === 0) {
    return null;
  }
  let best: ChessQuarksHint | null = null;
  let bestReduction = 0;
  for (const { from, to } of iterLegalMoves(pieces, color)) {
    const next = applyChessMove(pieces, from, to);
    const after = opponentCaptureThreatScore(next, color);
    const reduction = baseline - after;
    if (reduction > bestReduction) {
      bestReduction = reduction;
      best = { from, to, kind: 'block-capture' };
    }
  }
  return bestReduction > 0 ? best : null;
}

function scoreQuietMove(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  from: ChessSquare,
  to: ChessSquare,
  recentOurMoves: { from: ChessSquare; to: ChessSquare }[],
): number {
  const piece = pieceAt(pieces, from.row, from.col);
  if (!piece || piece.color !== color) {
    return -1;
  }
  if (isUndoOfLastOurMove(from, to, recentOurMoves)) {
    return -10_000;
  }
  for (const prior of recentOurMoves.slice(0, 4)) {
    if (squaresEqual(from, prior.from) && squaresEqual(to, prior.to)) {
      return -8_000;
    }
  }

  let score = 0;
  const centerDist = Math.abs(to.col - 3.5) + Math.abs(to.row - 3.5);
  score += Math.round((7 - centerDist) * 8);

  const backRank = color === 'white' ? CHESS_BOARD_SIZE - 1 : 0;
  if (!piece.hasMoved && piece.row === backRank) {
    if (piece.type === 'knight' || piece.type === 'bishop' || piece.type === 'rook') {
      score += 90;
    }
    if (piece.type === 'queen') {
      score -= 40;
    }
  }

  if (piece.type === 'pawn') {
    const forward = color === 'white' ? from.row - to.row : to.row - from.row;
    if (forward > 0) {
      score += forward * 35;
    }
    if (Math.abs(to.row - from.row) === 2) {
      score += 20;
    }
  }

  const mobilityBefore = countMobility(pieces, color);
  const after = applyChessMove(pieces, from, to);
  const mobilityAfter = countMobility(after, color);
  score += (mobilityAfter - mobilityBefore) * 4;

  const opp = opponentOf(color);
  if (chessStatus(after, opp).inCheck) {
    score += 120;
  }

  const last = recentOurMoves[0];
  if (last && squaresEqual(from, last.to)) {
    score -= 120;
  }

  return score;
}

function compareQuietHintMoves(
  a: { from: ChessSquare; to: ChessSquare },
  b: { from: ChessSquare; to: ChessSquare },
): number {
  if (a.from.row !== b.from.row) {
    return a.from.row - b.from.row;
  }
  if (a.from.col !== b.from.col) {
    return a.from.col - b.from.col;
  }
  if (a.to.row !== b.to.row) {
    return a.to.row - b.to.row;
  }
  return a.to.col - b.to.col;
}

function findQuietSuggestHint(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  recentOurMoves: { from: ChessSquare; to: ChessSquare }[],
): ChessQuarksHint | null {
  const quiet = iterLegalMoves(pieces, color).filter(({ to }) => !isCapture(pieces, color, to));
  if (quiet.length === 0) {
    return null;
  }
  let best: ChessQuarksHint | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const { from, to } of quiet) {
    const s = scoreQuietMove(pieces, color, from, to, recentOurMoves);
    if (
      s > bestScore ||
      (s === bestScore &&
        best &&
        compareQuietHintMoves({ from, to }, best) < 0)
    ) {
      bestScore = s;
      best = { from, to, kind: 'suggest' };
    }
  }
  return bestScore > Number.NEGATIVE_INFINITY / 2 ? best : null;
}

export function computeChessQuarksHint(
  pieces: readonly ChessPiece[],
  color: ChessColor,
  options?: ChessQuarksHintOptions,
): ChessQuarksHint | null {
  const seat =
    options?.yourSeat ??
    (color === 'white' ? 1 : 2);
  const recentOurMoves = recentMovesForSeat(options?.turnHistory, seat, 8);
  return (
    findWinHint(pieces, color) ??
    findBestCaptureHint(pieces, color) ??
    findBlockMateHint(pieces, color) ??
    findBlockOpponentCaptureHint(pieces, color) ??
    findQuietSuggestHint(pieces, color, recentOurMoves)
  );
}

/** Legacy API — mate, block mate, or valuable capture only. */
export function computeChessWinBlockHint(
  pieces: readonly ChessPiece[],
  color: ChessColor,
): ChessWinBlockHint | null {
  const hint = computeChessQuarksHint(pieces, color);
  if (!hint) {
    return null;
  }
  if (hint.kind === 'suggest') {
    return null;
  }
  if (hint.kind === 'capture') {
    return { from: hint.from, to: hint.to, kind: 'block-capture' };
  }
  return { from: hint.from, to: hint.to, kind: hint.kind as 'win' | 'block-mate' | 'block-capture' };
}
