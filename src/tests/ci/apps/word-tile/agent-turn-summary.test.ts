import { describe, test, expect } from '@jest/globals';
import {
  formatAttemptNote,
  formatPlaceTurnSummary,
  resolveMoveSummary,
  summarizeMove,
} from '@/apps/word-tile/back-end/rules';

/**
 * Word Tile's turn-text: its implementations of the kit's `summarizeMove` and
 * `attemptNote` hooks. Kit-level behaviour is covered by the game-platform suite.
 */
describe('summarizeMove', () => {
  test('formats a place move from rack tiles when no word list is given', () => {
    expect(
      summarizeMove({
        type: 'place',
        placements: [
          { row: 7, col: 6, letter: 'D' },
          { row: 7, col: 7, letter: 'A' },
          { row: 7, col: 8, letter: 'M' },
        ],
      }),
    ).toBe('Played DAM.');
  });

  test('formats a place move using the words actually on the board', () => {
    expect(formatPlaceTurnSummary([{ row: 7, col: 8, letter: 'S' }], ['SAGO'])).toBe(
      'Played SAGO.',
    );
    expect(
      formatPlaceTurnSummary(
        [
          { row: 7, col: 7, letter: 'A' },
          { row: 7, col: 8, letter: 'L' },
        ],
        ['SAL', 'AL'],
      ),
    ).toBe('Played SAL and AL.');
  });

  test('formats pass', () => {
    expect(summarizeMove({ type: 'pass' })).toBe('Passed.');
  });

  test('formats exchange with a count', () => {
    expect(summarizeMove({ type: 'exchange', letters: ['A', 'B'] })).toBe('Exchanged 2 tiles.');
    expect(summarizeMove({ type: 'exchange', letters: ['A'] })).toBe('Exchanged 1 tile.');
  });

  test('formats resign', () => {
    expect(summarizeMove({ type: 'resign' })).toBe('Resigned.');
  });

  test('falls back for a non-move payload', () => {
    expect(summarizeMove(null)).toBe('Finished its turn.');
    expect(summarizeMove({})).toBe('Finished its turn.');
  });
});

describe('resolveMoveSummary', () => {
  test('prefers the persisted turn-history line (hooks include board words)', () => {
    expect(
      resolveMoveSummary(
        { turnHistory: [{ seat: 2, summary: 'Played AME.' }] },
        { type: 'place', placements: [{ row: 7, col: 6, letter: 'A' }] },
      ),
    ).toBe('Played AME.');
  });

  test('falls back to the raw move when history is absent', () => {
    expect(
      resolveMoveSummary({}, { type: 'place', placements: [{ row: 7, col: 6, letter: 'A' }] }),
    ).toBe('Played A.');
  });
});

describe('formatAttemptNote', () => {
  test('names the word a rejected placement was trying', () => {
    const note = formatAttemptNote(
      JSON.stringify({
        type: 'place',
        placements: [
          { row: 7, col: 5, letter: 'A' },
          { row: 7, col: 6, letter: 'I' },
        ],
      }),
      'Unknown word: MANSIT (horizontal, 7,4-7,8). Every cross-word through new tiles must be valid.',
    );
    expect(note).toBe('Tried "AI" - invalid word "MANSIT"');
  });

  test('describes an unparseable attempt', () => {
    expect(formatAttemptNote('not json', 'Cell occupied')).toBe('Tried a move - Cell occupied');
  });

  test('describes a rejected exchange', () => {
    expect(
      formatAttemptNote(JSON.stringify({ type: 'exchange', letters: ['A', 'B'] }), 'Not enough tiles in bag'),
    ).toBe('Tried exchanging AB - Not enough tiles in bag');
  });

  test('describes a rejected pass', () => {
    expect(formatAttemptNote(JSON.stringify({ type: 'pass' }), 'nope')).toBe(
      'Tried to pass - nope',
    );
  });
});
