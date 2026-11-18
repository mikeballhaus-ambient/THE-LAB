import { describe, test, expect } from '@jest/globals';
import {
  edgeAdjacentEmptyCells,
  edgeNeighbours,
  formatAdjacentEmptyAnchors,
  formatBoardAscii,
  formatBoardOccupiedList,
} from '@/apps/word-tile/back-end/rules';

function emptyBoard(): Array<Array<{ letter: string } | null>> {
  return Array.from({ length: 15 }, () =>
    Array.from({ length: 15 }, () => null as { letter: string } | null),
  );
}

function boardWithXiHorizontal(): Array<Array<{ letter: string } | null>> {
  const board = emptyBoard();
  board[7][7] = { letter: 'X' };
  board[7][8] = { letter: 'I' };
  return board;
}

/**
 * Board rendering for the AI opponent's prompt, plus the shared edge-adjacency
 * rule that the placement validator also uses.
 */
describe('formatBoardAscii', () => {
  test('shows the tiles on row 7 with the premium legend', () => {
    const ascii = formatBoardAscii(boardWithXiHorizontal());
    expect(ascii).toContain('TW=triple word');
    expect(ascii).toContain('7 |');
    expect(ascii).toMatch(/X.*I/);
    expect(ascii).toContain('Premiums in this crop');
  });

  test('an empty board renders the centre window and the centre rule', () => {
    const ascii = formatBoardAscii(emptyBoard());
    expect(ascii).toContain('Board is empty');
    expect(ascii).toContain('(7,7)');
    expect(ascii).toContain('·');
  });
});

describe('formatBoardOccupiedList', () => {
  test('lists occupied cells as (row,col)=LETTER', () => {
    expect(formatBoardOccupiedList(boardWithXiHorizontal())).toBe('(7,7)=X (7,8)=I');
  });

  test('reports an empty board', () => {
    expect(formatBoardOccupiedList(emptyBoard())).toBe('(empty)');
  });
});

describe('edgeAdjacentEmptyCells / formatAdjacentEmptyAnchors', () => {
  test('includes the cell above I for a vertical HI hook', () => {
    expect(formatAdjacentEmptyAnchors(boardWithXiHorizontal())).toContain('(6,8)');
  });

  test('returns deduplicated neighbour cells', () => {
    const cells = edgeAdjacentEmptyCells(boardWithXiHorizontal() as never);
    const keys = cells.map((c) => `${c.row},${c.col}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('reports no anchors on an empty board', () => {
    expect(formatAdjacentEmptyAnchors(emptyBoard())).toContain('opening play uses center');
  });
});

describe('edgeNeighbours', () => {
  test('returns four neighbours for an interior cell', () => {
    expect(edgeNeighbours(7, 7)).toHaveLength(4);
  });

  test('clips to the board edges', () => {
    expect(edgeNeighbours(0, 0)).toHaveLength(2);
    expect(edgeNeighbours(14, 14)).toHaveLength(2);
  });
});
