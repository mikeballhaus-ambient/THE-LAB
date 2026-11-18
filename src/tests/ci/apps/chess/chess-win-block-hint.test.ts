import { describe, expect, test } from '@jest/globals';
import {
  computeChessQuarksHint,
  computeChessWinBlockHint,
  parseChessTurnSummaryMove,
} from '@/apps/chess/shared/chess-win-block-hint';

describe('computeChessWinBlockHint', () => {
  test('returns suggest on king-only start', () => {
    const pieces = [
      { id: 1, type: 'king' as const, color: 'white' as const, row: 7, col: 4, hasMoved: false },
      { id: 2, type: 'king' as const, color: 'black' as const, row: 0, col: 4, hasMoved: false },
    ];
    expect(computeChessQuarksHint(pieces, 'white')?.kind).toBe('suggest');
    expect(computeChessWinBlockHint(pieces, 'white')).toBeNull();
  });

  test('surfaces a legal capture when available', () => {
    const pieces = [
      { id: 1, type: 'bishop' as const, color: 'white' as const, row: 3, col: 3, hasMoved: true },
      { id: 2, type: 'pawn' as const, color: 'black' as const, row: 5, col: 5, hasMoved: true },
      {
        id: 3,
        type: 'king' as const,
        color: 'white' as const,
        row: 7,
        col: 4,
        hasMoved: false,
      },
      {
        id: 4,
        type: 'king' as const,
        color: 'black' as const,
        row: 0,
        col: 4,
        hasMoved: false,
      },
    ];
    const hint = computeChessQuarksHint(pieces, 'white');
    expect(hint?.kind).toBe('capture');
    expect(hint?.to).toEqual({ row: 5, col: 5 });
  });

  test('parseChessTurnSummaryMove reads coordinate summaries', () => {
    expect(parseChessTurnSummaryMove('c1→f4')).toEqual({
      from: { row: 7, col: 2 },
      to: { row: 4, col: 5 },
    });
    expect(parseChessTurnSummaryMove('e2→e4 (captures pawn)')).toEqual({
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
    });
  });

  test('quiet suggest does not undo the last ply on the same bishop diagonal', () => {
    const pieces = [
      { id: 1, type: 'bishop' as const, color: 'white' as const, row: 5, col: 3, hasMoved: true },
      { id: 2, type: 'bishop' as const, color: 'black' as const, row: 0, col: 3, hasMoved: true },
      { id: 3, type: 'king' as const, color: 'white' as const, row: 7, col: 4, hasMoved: false },
      { id: 4, type: 'king' as const, color: 'black' as const, row: 0, col: 4, hasMoved: false },
      { id: 5, type: 'pawn' as const, color: 'white' as const, row: 6, col: 4, hasMoved: false },
      { id: 6, type: 'pawn' as const, color: 'black' as const, row: 1, col: 4, hasMoved: false },
    ];
    const undoHint = computeChessQuarksHint(pieces, 'white', {
      yourSeat: 1,
      turnHistory: [{ seat: 1, summary: 'c4→d3' }],
    });
    expect(undoHint?.kind).toBe('suggest');
    expect(undoHint).not.toEqual({
      from: { row: 5, col: 3 },
      to: { row: 4, col: 2 },
      kind: 'suggest',
    });
  });

  test('does not suggest a capture that loses material to an immediate recapture', () => {
    const pieces = [
      { id: 1, type: 'bishop' as const, color: 'white' as const, row: 3, col: 5, hasMoved: true },
      { id: 2, type: 'pawn' as const, color: 'black' as const, row: 1, col: 2, hasMoved: true },
      { id: 3, type: 'queen' as const, color: 'black' as const, row: 0, col: 3, hasMoved: true },
      { id: 4, type: 'pawn' as const, color: 'white' as const, row: 6, col: 4, hasMoved: false },
      { id: 5, type: 'king' as const, color: 'white' as const, row: 7, col: 4, hasMoved: false },
      { id: 6, type: 'king' as const, color: 'black' as const, row: 0, col: 5, hasMoved: false },
    ];
    const hint = computeChessQuarksHint(pieces, 'white');
    expect(hint?.kind).not.toBe('capture');
    expect(hint).not.toEqual({
      from: { row: 3, col: 5 },
      to: { row: 1, col: 2 },
      kind: 'capture',
    });
  });
});
