import { describe, expect, test } from '@jest/globals';
import { tileWordGridAdapter } from '@/apps/word-tile/back-end/adapter';
import { CENTER_COL, CENTER_ROW } from '@/apps/word-tile/back-end/rules';
import type { TileWordGridState } from '@/apps/word-tile/back-end/rules';

function baseState(rack1: string[], rack2: string[]): TileWordGridState {
  const s = tileWordGridAdapter.createInitialState({
    gameId: 'tile-word-grid',
    opponentKind: 'ai',
    player1Id: 1,
    player2Id: 0,
    difficulty: 'medium',
  }) as TileWordGridState;
  return {
    ...s,
    racks: { 1: rack1, 2: rack2 },
  };
}

describe('tile-word-grid validation', () => {
  test('first play GO across center is legal', () => {
    const state = baseState(['G', 'O', 'A', 'B', 'C', 'D', 'E'], ['X', 'Y', 'Z', 'Q', 'W', 'R', 'T']);
    const col = CENTER_COL - 1;
    const move = {
      type: 'place',
      placements: [
        { row: CENTER_ROW, col, letter: 'G' },
        { row: CENTER_ROW, col: col + 1, letter: 'O' },
      ],
    };
    expect(tileWordGridAdapter.validateMove(state, move, 1).ok).toBe(true);
  });

  test('pass on first turn is rejected', () => {
    const state = baseState(['A', 'B', 'C', 'D', 'E', 'F', 'G'], ['H', 'I', 'J', 'K', 'L', 'M', 'N']);
    expect(tileWordGridAdapter.validateMove(state, { type: 'pass' }, 1).ok).toBe(false);
  });

  test('first play GO adds turn score to player', () => {
    const state = baseState(['G', 'O', 'A', 'B', 'C', 'D', 'E'], ['X', 'Y', 'Z', 'Q', 'W', 'R', 'T']);
    const col = CENTER_COL - 1;
    const move = {
      type: 'place',
      placements: [
        { row: CENTER_ROW, col, letter: 'G' },
        { row: CENTER_ROW, col: col + 1, letter: 'O' },
      ],
    };
    const next = tileWordGridAdapter.applyMove(state, move, 1) as TileWordGridState;
    expect(next.scores[1]).toBeGreaterThan(0);
    expect(next.turnHistory).toHaveLength(1);
    expect(next.turnHistory?.[0]?.summary).toContain('GO');
  });
});
