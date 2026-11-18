import { describe, expect, test } from '@jest/globals';
import { formatWordTileAgentLegalHints } from '@/apps/word-tile/back-end/word-tile-agent-legal-hints';
import { enumerateWordTileLegalPlays } from '@/apps/word-tile/back-end/word-tile-legal-play-search';
import type { BoardCell, TileWordGridState } from '@/apps/word-tile/back-end/rules';
import { BOARD_SIZE, CENTER_COL, CENTER_ROW } from '@/apps/word-tile/back-end/rules';

function emptyBoard(): BoardCell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): BoardCell => null),
  );
}

describe('word-tile agent legal hints', () => {
  test('finds at least one legal hook when RU is on board and rack has usable tiles', () => {
    const board = emptyBoard();
    board[CENTER_ROW]![CENTER_COL] = { letter: 'R', seat: 1 };
    board[CENTER_ROW]![CENTER_COL + 1] = { letter: 'U', seat: 1 };
    const state: TileWordGridState = {
      board,
      racks: { 1: [], 2: ['I', 'D', 'N', 'A'] },
      scores: { 1: 10, 2: 0 },
      bag: [],
      passesInRow: 0,
      firstMove: false,
      resignedSeat: null,
      premiums: null,
      turnHistory: [],
    };
    const plays = enumerateWordTileLegalPlays(state, 2);
    expect(plays.length).toBeGreaterThan(0);
    const hint = formatWordTileAgentLegalHints(state, 2, 'boss');
    expect(hint).toContain('Server-ranked legal plays');
    expect(hint).not.toContain('None found');
  });

  test('medium tier includes ranked plays with a smaller default cap', () => {
    const board = emptyBoard();
    board[CENTER_ROW]![CENTER_COL] = { letter: 'R', seat: 1 };
    board[CENTER_ROW]![CENTER_COL + 1] = { letter: 'U', seat: 1 };
    const state: TileWordGridState = {
      board,
      racks: { 1: [], 2: ['I', 'D', 'N', 'A'] },
      scores: { 1: 10, 2: 0 },
      bag: [],
      passesInRow: 0,
      firstMove: false,
      resignedSeat: null,
      premiums: null,
      turnHistory: [],
    };
    const hint = formatWordTileAgentLegalHints(state, 2, 'medium');
    expect(hint).toContain('Server-ranked legal plays');
    expect(hint).not.toContain('3.');
  });

  test('boss user prompt block omits hints on easy tier', () => {
    const board = emptyBoard();
    const state: TileWordGridState = {
      board,
      racks: { 1: ['A'], 2: ['B'] },
      scores: { 1: 0, 2: 0 },
      bag: [],
      passesInRow: 0,
      firstMove: true,
      resignedSeat: null,
      premiums: null,
      turnHistory: [],
    };
    expect(formatWordTileAgentLegalHints(state, 2, 'easy')).toBe('');
  });
});
