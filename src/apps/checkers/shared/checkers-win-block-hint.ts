import {
  applyMove,
  BOARD_SIZE,
  captureDestinations,
  createInitialState,
  hasCaptureAvailable,
  legalMovesFor,
  pieceAt,
  type CheckersColor,
  type CheckersMove,
  type CheckersPiece,
  type CheckersState,
} from './checkers-rules';

export type CheckersQuarksHintKind = 'win' | 'block' | 'block-capture' | 'capture' | 'suggest';

export interface CheckersQuarksHint {
  move: CheckersMove;
  kind: CheckersQuarksHintKind;
  /** Same-turn landing squares after the first jump (double/triple jump path). */
  chainLandings?: { row: number; col: number }[];
  chainCaptureCount?: number;
}

interface JumpChainPreview {
  captures: number;
  landings: { row: number; col: number }[];
}

/** @deprecated Use {@link CheckersQuarksHint} */
export interface CheckersWinBlockHint {
  move: CheckersMove;
  kind: 'win' | 'block';
}

function collectMoves(state: CheckersState, seat: CheckersState['currentSeat']): CheckersMove[] {
  const pseudo: CheckersState = { ...state, currentSeat: seat };
  const moves: CheckersMove[] = [];
  for (const p of state.pieces.filter((x) => x.color === seat)) {
    if (pseudo.jumpChainPieceId != null && p.id !== pseudo.jumpChainPieceId) {
      continue;
    }
    for (const dest of legalMovesFor(pseudo, p)) {
      moves.push({ type: 'move', pieceId: p.id, toRow: dest.row, toCol: dest.col });
    }
  }
  return moves;
}

function applyAsSeat(state: CheckersState, move: CheckersMove, seat: number): CheckersState {
  return applyMove(state, move, seat);
}

function isCaptureMove(state: CheckersState, move: CheckersMove): boolean {
  const piece = state.pieces.find((p) => p.id === move.pieceId);
  if (!piece) {
    return false;
  }
  return captureDestinations(state.pieces, piece).some(
    (c) => c.row === move.toRow && c.col === move.toCol,
  );
}

function captureMovesForSeat(state: CheckersState, seat: CheckersColor): CheckersMove[] {
  return collectMoves(state, seat).filter((m) => isCaptureMove(state, m));
}

function capturesMandatoryForSeat(state: CheckersState, seat: CheckersColor): boolean {
  if (state.jumpChainPieceId != null) {
    const chainPiece = state.pieces.find((p) => p.id === state.jumpChainPieceId);
    return chainPiece ? captureDestinations(state.pieces, chainPiece).length > 0 : false;
  }
  return hasCaptureAvailable(state.pieces, seat);
}

function pickBestByScore(
  moves: CheckersMove[],
  state: CheckersState,
  seat: CheckersColor,
  kind: CheckersQuarksHintKind,
): CheckersQuarksHint | null {
  if (moves.length === 0) {
    return null;
  }
  let best: CheckersMove | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const move of moves) {
    const s = scoreSuggestedMove(state, move, seat);
    if (s > bestScore) {
      bestScore = s;
      best = move;
      continue;
    }
    if (s === bestScore && best) {
      if (
        move.pieceId < best.pieceId ||
        (move.pieceId === best.pieceId &&
          (move.toRow < best.toRow || (move.toRow === best.toRow && move.toCol < best.toCol)))
      ) {
        best = move;
      }
    }
  }
  return best ? { move: best, kind } : null;
}

function findWinHint(state: CheckersState): CheckersQuarksHint | null {
  const seat = state.currentSeat;
  for (const move of collectMoves(state, seat)) {
    const next = applyAsSeat(state, move, seat);
    if (next.finished && next.winnerSeat === seat) {
      return { move, kind: 'win' };
    }
  }
  return null;
}

function findBlockWinHint(state: CheckersState): CheckersQuarksHint | null {
  const seat = state.currentSeat;
  const myMoves = collectMoves(state, seat);
  const opp = seat === 1 ? 2 : 1;
  const oppPseudo: CheckersState = { ...state, currentSeat: opp as 1 | 2, jumpChainPieceId: null };
  const oppCanWin = collectMoves(oppPseudo, opp as 1 | 2).some((move) => {
    const next = applyAsSeat(oppPseudo, move, opp);
    return next.finished && next.winnerSeat === opp;
  });
  if (!oppCanWin) {
    return null;
  }
  for (const move of myMoves) {
    const next = applyAsSeat(state, move, seat);
    const oppNext: CheckersState = { ...next, currentSeat: opp as 1 | 2, jumpChainPieceId: null };
    const stillWins = collectMoves(oppNext, opp as 1 | 2).some((m) => {
      const after = applyAsSeat(oppNext, m, opp);
      return after.finished && after.winnerSeat === opp;
    });
    if (!stillWins) {
      return { move, kind: 'block' };
    }
  }
  return null;
}

function opponentJumpThreatScore(state: CheckersState, opp: CheckersColor): number {
  const pseudo: CheckersState = { ...state, currentSeat: opp, jumpChainPieceId: null };
  const caps = captureMovesForSeat(pseudo, opp);
  let best = 0;
  for (const cap of caps) {
    const piece = state.pieces.find((p) => p.id === cap.pieceId);
    if (!piece) {
      continue;
    }
    const victimMeta = captureDestinations(state.pieces, piece).find(
      (c) => c.row === cap.toRow && c.col === cap.toCol,
    );
    const victim = victimMeta ? state.pieces.find((p) => p.id === victimMeta.capturedId) : undefined;
    if (victim) {
      best = Math.max(best, victim.isKing ? 120 : 60);
    }
  }
  return best;
}

function findBlockOpponentJumpHint(state: CheckersState): CheckersQuarksHint | null {
  const seat = state.currentSeat;
  const opp = (seat === 1 ? 2 : 1) as CheckersColor;
  const baseline = opponentJumpThreatScore(state, opp);
  if (baseline === 0) {
    return null;
  }
  let bestMove: CheckersMove | null = null;
  let bestReduction = 0;
  for (const move of collectMoves(state, seat)) {
    const next = applyAsSeat(state, move, seat);
    const after = opponentJumpThreatScore(next, opp);
    const reduction = baseline - after;
    if (reduction > bestReduction) {
      bestReduction = reduction;
      bestMove = move;
    } else if (reduction === bestReduction && bestMove && move.pieceId < bestMove.pieceId) {
      bestMove = move;
    }
  }
  if (!bestMove || bestReduction <= 0) {
    return null;
  }
  return { move: bestMove, kind: 'block-capture' };
}

function previewGreedyJumpChain(
  state: CheckersState,
  firstMove: CheckersMove,
  seat: CheckersColor,
): JumpChainPreview {
  const landings: { row: number; col: number }[] = [
    { row: firstMove.toRow, col: firstMove.toCol },
  ];
  let captures = isCaptureMove(state, firstMove) ? 1 : 0;
  let s = applyAsSeat(state, firstMove, seat);

  while (s.jumpChainPieceId === firstMove.pieceId && !s.finished) {
    const piece = s.pieces.find((p) => p.id === firstMove.pieceId);
    if (!piece) {
      break;
    }
    const options = captureDestinations(s.pieces, piece);
    if (options.length === 0) {
      break;
    }
    let bestDest = options[0]!;
    let bestTailCaptures = -1;
    for (const dest of options) {
      const tailMove: CheckersMove = {
        type: 'move',
        pieceId: firstMove.pieceId,
        toRow: dest.row,
        toCol: dest.col,
      };
      const tail = previewGreedyJumpChain(s, tailMove, seat);
      if (tail.captures > bestTailCaptures) {
        bestTailCaptures = tail.captures;
        bestDest = dest;
      }
    }
    const chainMove: CheckersMove = {
      type: 'move',
      pieceId: firstMove.pieceId,
      toRow: bestDest.row,
      toCol: bestDest.col,
    };
    s = applyAsSeat(s, chainMove, seat);
    landings.push({ row: bestDest.row, col: bestDest.col });
    captures += 1;
  }

  return { captures, landings };
}

/** Board after our move and any mandatory follow-up jumps on the same piece. */
function stateAfterCommittedMove(
  state: CheckersState,
  firstMove: CheckersMove,
  seat: CheckersColor,
): CheckersState {
  let s = applyAsSeat(state, firstMove, seat);
  while (s.jumpChainPieceId === firstMove.pieceId && !s.finished) {
    const piece = s.pieces.find((p) => p.id === firstMove.pieceId);
    if (!piece) {
      break;
    }
    const options = captureDestinations(s.pieces, piece);
    if (options.length === 0) {
      break;
    }
    let bestDest = options[0]!;
    let bestTailCaptures = -1;
    for (const dest of options) {
      const tailMove: CheckersMove = {
        type: 'move',
        pieceId: firstMove.pieceId,
        toRow: dest.row,
        toCol: dest.col,
      };
      const tail = previewGreedyJumpChain(s, tailMove, seat);
      if (tail.captures > bestTailCaptures) {
        bestTailCaptures = tail.captures;
        bestDest = dest;
      }
    }
    s = applyAsSeat(
      s,
      { type: 'move', pieceId: firstMove.pieceId, toRow: bestDest.row, toCol: bestDest.col },
      seat,
    );
  }
  return s;
}

/**
 * One-ply: after our turn ends, can the opponent jump one of our pieces (especially the mover)?
 */
function ourHangPenaltyAfterTurn(
  state: CheckersState,
  move: CheckersMove,
  seat: CheckersColor,
): number {
  const after = stateAfterCommittedMove(state, move, seat);
  const opp = (seat === 1 ? 2 : 1) as CheckersColor;
  const oppPseudo: CheckersState = { ...after, currentSeat: opp, jumpChainPieceId: null };
  const movedBefore = state.pieces.find((p) => p.id === move.pieceId);
  const movedAfter = after.pieces.find((p) => p.id === move.pieceId);

  let penalty = 0;
  for (const cap of captureMovesForSeat(oppPseudo, opp)) {
    const jumper = after.pieces.find((p) => p.id === cap.pieceId);
    if (!jumper) {
      continue;
    }
    const meta = captureDestinations(after.pieces, jumper).find(
      (c) => c.row === cap.toRow && c.col === cap.toCol,
    );
    const victim = meta ? after.pieces.find((p) => p.id === meta.capturedId) : undefined;
    if (!victim || victim.color !== seat) {
      continue;
    }
    let p = victim.isKing ? 28_000 : 5_000;
    if (victim.id === move.pieceId) {
      p += 18_000;
    }
    const justCrowned =
      movedBefore != null &&
      movedAfter != null &&
      !movedBefore.isKing &&
      movedAfter.isKing &&
      victim.id === move.pieceId;
    if (justCrowned) {
      p += 45_000;
    }
    penalty = Math.max(penalty, p);
  }
  return penalty;
}

function findBestCaptureHint(state: CheckersState): CheckersQuarksHint | null {
  const seat = state.currentSeat;
  const jumps = captureMovesForSeat(state, seat);
  if (jumps.length === 0) {
    return null;
  }

  let best: CheckersQuarksHint | null = null;
  let bestChainCaptures = -1;
  let bestTieScore = Number.NEGATIVE_INFINITY;

  for (const move of jumps) {
    const chain = previewGreedyJumpChain(state, move, seat);
    const tieScore = scoreSuggestedMove(state, move, seat) + chain.captures * 15_000;
    if (
      chain.captures > bestChainCaptures ||
      (chain.captures === bestChainCaptures && tieScore > bestTieScore)
    ) {
      bestChainCaptures = chain.captures;
      bestTieScore = tieScore;
      best = {
        move,
        kind: 'capture',
        chainCaptureCount: chain.captures,
        chainLandings: chain.landings.length > 0 ? chain.landings : undefined,
      };
    } else if (
      chain.captures === bestChainCaptures &&
      tieScore === bestTieScore &&
      best &&
      (move.pieceId < best.move.pieceId ||
        (move.pieceId === best.move.pieceId &&
          (move.toRow < best.move.toRow ||
            (move.toRow === best.move.toRow && move.toCol < best.move.toCol))))
    ) {
      best = {
        move,
        kind: 'capture',
        chainCaptureCount: chain.captures,
        chainLandings: chain.landings.length > 0 ? chain.landings : undefined,
      };
    }
  }

  return best;
}

function promotionRow(seat: CheckersColor): number {
  return seat === 1 ? 0 : BOARD_SIZE - 1;
}

function scoreSuggestedMove(state: CheckersState, move: CheckersMove, seat: CheckersColor): number {
  const piece = state.pieces.find((p) => p.id === move.pieceId);
  if (!piece) {
    return -1;
  }
  let score = 0;

  const isCapture = isCaptureMove(state, move);
  if (isCapture) {
    score += 10_000;
    const victim = captureDestinations(state.pieces, piece).find(
      (c) => c.row === move.toRow && c.col === move.toCol,
    );
    const captured = victim ? state.pieces.find((p) => p.id === victim.capturedId) : undefined;
    if (captured?.isKing) {
      score += 2_000;
    }
    const chain = previewGreedyJumpChain(state, move, seat);
    score += chain.captures * 12_000;
  }

  const crowns = !piece.isKing && move.toRow === promotionRow(seat);
  if (crowns) {
    score += 3_500;
  }

  if (!piece.isKing) {
    const promo = promotionRow(seat);
    const closer = seat === 1 ? piece.row - move.toRow : move.toRow - piece.row;
    if (closer > 0) {
      score += closer * 250;
    }
    score += (BOARD_SIZE - 1 - Math.abs(move.toRow - promo)) * 35;
  }

  const backward =
    !piece.isKing && (seat === 1 ? move.toRow > piece.row : move.toRow < piece.row);
  if (backward) {
    score -= 400;
  }

  const enemyBehind = pieceAt(state.pieces, piece.row + (seat === 1 ? 1 : -1), piece.col - 1);
  const enemyBehind2 = pieceAt(state.pieces, piece.row + (seat === 1 ? 1 : -1), piece.col + 1);
  if (
    enemyBehind &&
    enemyBehind.color !== seat &&
    move.toRow === piece.row &&
    Math.abs(move.toCol - piece.col) === 1
  ) {
    score -= 150;
  }
  if (
    enemyBehind2 &&
    enemyBehind2.color !== seat &&
    move.toRow === piece.row &&
    Math.abs(move.toCol - piece.col) === 1
  ) {
    score -= 150;
  }

  const colDist = Math.abs(move.toCol - (BOARD_SIZE - 1) / 2);
  score += Math.round(((BOARD_SIZE - 1) / 2 - colDist) * 40);

  score -= ourHangPenaltyAfterTurn(state, move, seat);

  return score;
}

function exposesPieceToNextPlyJump(
  state: CheckersState,
  move: CheckersMove,
  seat: CheckersColor,
): boolean {
  return ourHangPenaltyAfterTurn(state, move, seat) > 0;
}

function preferMovesWithoutNextPlyHang(
  moves: CheckersMove[],
  state: CheckersState,
  seat: CheckersColor,
): CheckersMove[] {
  const safe = moves.filter((m) => !exposesPieceToNextPlyJump(state, m, seat));
  return safe.length > 0 ? safe : moves;
}

function findQuietSuggestHint(state: CheckersState): CheckersQuarksHint | null {
  const seat = state.currentSeat;
  if (capturesMandatoryForSeat(state, seat)) {
    return null;
  }
  const quiet = collectMoves(state, seat).filter((m) => !isCaptureMove(state, m));
  const candidates = preferMovesWithoutNextPlyHang(quiet, state, seat);
  return pickBestByScore(candidates, state, seat, 'suggest');
}

/** Win, your jumps, block threats, else quiet suggest (one ply; no search). */
export function computeCheckersQuarksHint(state: CheckersState): CheckersQuarksHint | null {
  return (
    findWinHint(state) ??
    findBestCaptureHint(state) ??
    findBlockWinHint(state) ??
    findBlockOpponentJumpHint(state) ??
    findQuietSuggestHint(state)
  );
}

/** One winning jump or block of opponent one-ply win only (legacy API). */
export function computeCheckersWinBlockHint(state: CheckersState): CheckersWinBlockHint | null {
  const hint =
    findWinHint(state) ?? findBlockWinHint(state);
  return hint ? { move: hint.move, kind: hint.kind === 'win' ? 'win' : 'block' } : null;
}

export function emptyCheckersState(): CheckersState {
  return createInitialState();
}

export function pieceById(state: CheckersState, id: number): CheckersPiece | undefined {
  return state.pieces.find((p) => p.id === id);
}
