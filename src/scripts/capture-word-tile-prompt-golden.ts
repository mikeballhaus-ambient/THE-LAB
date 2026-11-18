/**
 * Regenerate Word Tile's AI prompt golden fixture.
 *
 * Only run this for a **deliberate** prompt change. The fixture pins the exact
 * text the opponent is given, so regenerating it silently discards the guarantee.
 *
 *   npx tsx src/scripts/capture-word-tile-prompt-golden.ts
 */
import { writeFileSync } from 'node:fs';
import {
  buildAgentSystemPromptForTier,
  buildUserPrompt,
  summarizeMove,
  formatAttemptNote,
  type TileWordGridState,
} from '../apps/word-tile/back-end/rules';

const TIERS = ['easy', 'medium', 'hard', 'boss'] as const;

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

const systemPrompts: Record<string, string> = {};
const userPrompts: Record<string, string> = {};
const userPromptsAfterRejection: Record<string, string> = {};
for (const tier of TIERS) {
  systemPrompts[tier] = buildAgentSystemPromptForTier(tier);
  userPrompts[tier] = buildUserPrompt(sampleState(), 1, tier);
  userPromptsAfterRejection[tier] = buildUserPrompt(sampleState(), 1, tier, {
    lastRejection: 'Unknown word',
    attempt: 2,
  });
}

const fixture = {
  systemPrompts,
  userPrompts,
  userPromptsAfterRejection,
  turnText: {
    place: summarizeMove({
      type: 'place',
      placements: [
        { row: 7, col: 6, letter: 'D' },
        { row: 7, col: 7, letter: 'A' },
        { row: 7, col: 8, letter: 'M' },
      ],
    }),
    placeWithWords: summarizeMove(
      { type: 'place', placements: [{ row: 7, col: 8, letter: 'S' }] },
      ['SAGO'],
    ),
    pass: summarizeMove({ type: 'pass' }),
    exchange2: summarizeMove({ type: 'exchange', letters: ['A', 'B'] }),
    exchange1: summarizeMove({ type: 'exchange', letters: ['A'] }),
    resign: summarizeMove({ type: 'resign' }),
    fallback: summarizeMove(null),
    attemptPlace: formatAttemptNote(
      JSON.stringify({
        type: 'place',
        placements: [
          { row: 7, col: 5, letter: 'A' },
          { row: 7, col: 6, letter: 'I' },
        ],
      }),
      'Unknown word: MANSIT (horizontal, 7,4-7,8). Every cross-word through new tiles must be valid.',
    ),
    attemptBadJson: formatAttemptNote('not json', 'Cell occupied'),
    attemptExchange: formatAttemptNote(
      JSON.stringify({ type: 'exchange', letters: ['A', 'B'] }),
      'Not enough tiles in bag',
    ),
    attemptPass: formatAttemptNote(JSON.stringify({ type: 'pass' }), 'nope'),
    attemptOther: formatAttemptNote(JSON.stringify({ type: 'resign' }), 'nope'),
  },
};

writeFileSync(
  'src/tests/ci/apps/word-tile/__fixtures__/word-tile-prompt-golden.json',
  `${JSON.stringify(fixture, null, 2)}\n`,
  'utf8',
);

console.log('Captured systemPrompts, userPrompts, userPromptsAfterRejection, turnText');
