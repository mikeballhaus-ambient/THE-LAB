import { describe, expect, test } from '@jest/globals';
import {
  computeCheckersQuarksHint,
  computeCheckersWinBlockHint,
} from '@/apps/checkers/shared/checkers-win-block-hint';
import {
  captureDestinations,
  createInitialState,
  validateMove,
  type CheckersState,
} from '@/apps/checkers/shared/checkers-rules';

describe('computeCheckersQuarksHint', () => {
  test('opening position returns a legal suggested move', () => {
    const state = createInitialState();
    const hint = computeCheckersQuarksHint(state);
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('suggest');
    expect(computeCheckersWinBlockHint(state)).toBeNull();
    const check = validateMove(state, hint!.move, 1);
    expect(check.ok).toBe(true);
  });

  test('prefers a legal jump over a quiet move when capture is available', () => {
    const state: CheckersState = {
      pieces: [
        { id: 1, row: 5, col: 4, color: 1, isKing: false },
        { id: 2, row: 4, col: 3, color: 2, isKing: false },
        { id: 3, row: 2, col: 1, color: 2, isKing: false },
      ],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 0,
      jumpChainPieceId: null,
    };
    const hint = computeCheckersQuarksHint(state);
    expect(hint?.kind).toBe('capture');
    expect(hint?.move).toMatchObject({ pieceId: 1, toRow: 3, toCol: 2 });
    expect(validateMove(state, hint!.move, 1).ok).toBe(true);
  });

  test('prefers a double-jump chain when available', () => {
    const state: CheckersState = {
      pieces: [
        { id: 1, row: 5, col: 4, color: 1, isKing: false },
        { id: 2, row: 4, col: 3, color: 2, isKing: false },
        { id: 3, row: 2, col: 1, color: 2, isKing: false },
      ],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 0,
      jumpChainPieceId: null,
    };
    const hint = computeCheckersQuarksHint(state);
    expect(hint?.kind).toBe('capture');
    expect(hint?.chainCaptureCount).toBe(2);
    expect(hint?.chainLandings).toEqual([
      { row: 3, col: 2 },
      { row: 1, col: 0 },
    ]);
  });

  test('quiet hint does not walk a new king into a one-ply jump when a safe king move exists', () => {
    const state: CheckersState = {
      pieces: [
        { id: 1, row: 0, col: 2, color: 1, isKing: true },
        { id: 2, row: 2, col: 4, color: 2, isKing: true },
      ],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 6,
      jumpChainPieceId: null,
    };
    const hungKingStep = { type: 'move' as const, pieceId: 1, toRow: 1, toCol: 3 };
    expect(validateMove(state, hungKingStep, 1).ok).toBe(true);
    const afterHangStep = {
      ...state,
      pieces: state.pieces.map((p) =>
        p.id === 1 ? { ...p, row: 1, col: 3 } : p,
      ),
      currentSeat: 2 as const,
    };
    const oppCanJump = afterHangStep.pieces
      .filter((p) => p.color === 2)
      .some((p) =>
        captureDestinations(afterHangStep.pieces, p).some((c) => c.capturedId === 1),
      );
    expect(oppCanJump).toBe(true);

    const hint = computeCheckersQuarksHint(state);
    expect(hint?.kind).toBe('suggest');
    expect(hint?.move).toMatchObject({ pieceId: 1, toRow: 1, toCol: 1 });
  });

  test('quiet hint prefers another piece over stepping a new king into a jump', () => {
    const state: CheckersState = {
      pieces: [
        { id: 1, row: 0, col: 2, color: 1, isKing: true },
        { id: 2, row: 2, col: 4, color: 2, isKing: true },
        { id: 3, row: 5, col: 0, color: 1, isKing: false },
      ],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 10,
      jumpChainPieceId: null,
    };
    const hint = computeCheckersQuarksHint(state);
    expect(hint?.kind).toBe('suggest');
    expect(hint?.move.pieceId).toBe(3);
    expect(hint?.move).toMatchObject({ pieceId: 3, toRow: 4, toCol: 1 });
  });

  test('suggested move advances a man toward promotion when possible', () => {
    const state: CheckersState = {
      pieces: [
        { id: 1, row: 5, col: 1, color: 1, isKing: false },
        { id: 2, row: 0, col: 6, color: 2, isKing: false },
      ],
      currentSeat: 1,
      winnerSeat: null,
      finished: false,
      moveCount: 0,
      jumpChainPieceId: null,
    };
    const hint = computeCheckersQuarksHint(state);
    expect(hint?.kind).toBe('suggest');
    expect(hint?.move.pieceId).toBe(1);
    expect(hint?.move.toRow).toBe(4);
  });
});
