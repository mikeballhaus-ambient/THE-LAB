import { describe, test, expect } from '@jest/globals';
import golden from './__fixtures__/word-tile-prompt-golden.json';
import {
  buildAgentSystemPromptForTier,
  buildUserPrompt,
  formatAttemptNote,
  summarizeMove,
  type TileWordGridState,
} from '@/apps/word-tile/back-end/rules';

/**
 * Golden test for Word Tile's AI prompt surface.
 *
 * The refactor that collapsed `llm-agent-move.ts` + `agent-turn.ts` into
 * `adapter.ts` + `rules.ts` moved prompt text between modules. AI behaviour is
 * whatever these strings say, so they are pinned against a fixture captured from
 * the pre-refactor code: if any assembled prompt or turn line changes, this fails.
 *
 * Regenerate only for a deliberate prompt change:
 *   npx tsx src/scripts/capture-word-tile-prompt-golden.ts
 */
const TIERS = ['easy', 'medium', 'hard', 'boss'] as const;

/** Fixed board so the user prompt is deterministic. */
function sampleState(): TileWordGridState {
  const board = Array.from({ length: 15 }, () =>
    Array.from({ length: 15 }, () => null as { letter: string; seat: number } | null),
  );
  board[7]![7] = { letter: 'Q', seat: 1 };
  board[7]![8] = { letter: 'U', seat: 1 };
  return {
    board,
    racks: { 1: ['I', 'Z'], 2: ['A', 'B'] },
    scores: { 1: 12, 2: 8 },
    bag: ['E', 'E'],
    passesInRow: 0,
    firstMove: false,
    resignedSeat: null,
    premiums: null,
    turnHistory: [],
  };
}

describe('golden — user prompt is byte-identical', () => {
  test.each(TIERS)('tier %s', (tier) => {
    expect(buildUserPrompt(sampleState(), 1, tier)).toBe(
      (golden.userPrompts as Record<string, string>)[tier],
    );
  });

  test.each(TIERS)('tier %s after a rejection', (tier) => {
    expect(
      buildUserPrompt(sampleState(), 1, tier, {
        lastRejection: 'Unknown word',
        attempt: 2,
      }),
    ).toBe(
      (golden.userPromptsAfterRejection as Record<string, string>)[tier],
    );
  });
});

describe('golden — assembled system prompt is byte-identical', () => {
  test.each(TIERS)('tier %s', (tier) => {
    expect(buildAgentSystemPromptForTier(tier)).toBe(
      (golden.systemPrompts as Record<string, string>)[tier],
    );
  });
});

describe('golden — turn summaries are byte-identical', () => {
  test('place from rack tiles', () => {
    expect(
      summarizeMove({
        type: 'place',
        placements: [
          { row: 7, col: 6, letter: 'D' },
          { row: 7, col: 7, letter: 'A' },
          { row: 7, col: 8, letter: 'M' },
        ],
      }),
    ).toBe(golden.turnText.place);
  });

  test('place using board words', () => {
    expect(
      summarizeMove(
        { type: 'place', placements: [{ row: 7, col: 8, letter: 'S' }] },
        ['SAGO'],
      ),
    ).toBe(golden.turnText.placeWithWords);
  });

  test('pass / exchange / resign / fallback', () => {
    expect(summarizeMove({ type: 'pass' })).toBe(golden.turnText.pass);
    expect(summarizeMove({ type: 'exchange', letters: ['A', 'B'] })).toBe(
      golden.turnText.exchange2,
    );
    expect(summarizeMove({ type: 'exchange', letters: ['A'] })).toBe(golden.turnText.exchange1);
    expect(summarizeMove({ type: 'resign' })).toBe(golden.turnText.resign);
    expect(summarizeMove(null)).toBe(golden.turnText.fallback);
  });
});

describe('golden — attempt notes are byte-identical', () => {
  const unknownWord =
    'Unknown word: MANSIT (horizontal, 7,4-7,8). Every cross-word through new tiles must be valid.';

  test('rejected placement names the attempted word', () => {
    expect(
      formatAttemptNote(
        JSON.stringify({
          type: 'place',
          placements: [
            { row: 7, col: 5, letter: 'A' },
            { row: 7, col: 6, letter: 'I' },
          ],
        }),
        unknownWord,
      ),
    ).toBe(golden.turnText.attemptPlace);
  });

  test('unparseable arguments', () => {
    expect(formatAttemptNote('not json', 'Cell occupied')).toBe(golden.turnText.attemptBadJson);
  });

  test('rejected exchange and pass', () => {
    expect(
      formatAttemptNote(
        JSON.stringify({ type: 'exchange', letters: ['A', 'B'] }),
        'Not enough tiles in bag',
      ),
    ).toBe(golden.turnText.attemptExchange);
    expect(formatAttemptNote(JSON.stringify({ type: 'pass' }), 'nope')).toBe(
      golden.turnText.attemptPass,
    );
  });

  test('unrecognised move type', () => {
    expect(formatAttemptNote(JSON.stringify({ type: 'resign' }), 'nope')).toBe(
      golden.turnText.attemptOther,
    );
  });
});
