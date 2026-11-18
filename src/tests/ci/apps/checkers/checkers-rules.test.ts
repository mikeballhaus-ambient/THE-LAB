import { describe, expect, test } from '@jest/globals';
import {
  applyMove,
  applyTurnTimeout,
  createInitialState,
  simpleDestinations,
  summarizeCheckersMove,
  validateMove,
} from '@/apps/checkers/shared/checkers-rules';

describe('checkers rules', () => {
  test('initial state includes empty turnHistory', () => {
    const s = createInitialState();
    expect(s.turnHistory).toEqual([]);
    expect(s.currentSeat).toBe(1);
  });

  test('applyMove appends a turnHistory entry for the moving seat', () => {
    const s0 = createInitialState();
    const piece = s0.pieces.find((p) => p.color === 1);
    expect(piece).toBeDefined();
    const dest = simpleDestinations(s0.pieces, piece!)[0];
    expect(dest).toBeDefined();
    const move = {
      type: 'move' as const,
      pieceId: piece!.id,
      toRow: dest!.row,
      toCol: dest!.col,
    };
    expect(summarizeCheckersMove(s0, move)).toContain(String(piece!.id));
    const s1 = applyMove(s0, move, 1);
    expect(s1.turnHistory).toHaveLength(1);
    expect(s1.turnHistory![0]).toEqual({
      seat: 1,
      summary: summarizeCheckersMove(s0, move),
    });
  });

  test('applyTurnTimeout passes the turn and records history', () => {
    const s0 = createInitialState();
    const s1 = applyTurnTimeout(s0, 1);
    expect(s1.currentSeat).toBe(2);
    expect(s1.jumpChainPieceId).toBeNull();
    expect(s1.turnHistory).toHaveLength(1);
    expect(s1.turnHistory![0]?.summary).toBe('Turn timed out');
  });

  test('double jump keeps the same seat until the chain ends', () => {
    const s0 = {
      pieces: [
        { id: 1, row: 5, col: 4, color: 1 as const, isKing: false },
        { id: 2, row: 4, col: 3, color: 2 as const, isKing: false },
        { id: 3, row: 2, col: 1, color: 2 as const, isKing: false },
      ],
      currentSeat: 1 as const,
      winnerSeat: null,
      finished: false,
      moveCount: 0,
      turnHistory: [],
      jumpChainPieceId: null,
    };
    const first = { type: 'move' as const, pieceId: 1, toRow: 3, toCol: 2 };
    expect(validateMove(s0, first, 1).ok).toBe(true);
    const s1 = applyMove(s0, first, 1);
    expect(s1.currentSeat).toBe(1);
    expect(s1.jumpChainPieceId).toBe(1);
    expect(s1.pieces).toHaveLength(2);

    const second = { type: 'move' as const, pieceId: 1, toRow: 1, toCol: 0 };
    expect(validateMove(s1, second, 1).ok).toBe(true);
    const s2 = applyMove(s1, second, 1);
    expect(s2.jumpChainPieceId).toBeNull();
    expect(s2.currentSeat).toBe(2);
    expect(s2.pieces).toHaveLength(1);
  });
});
