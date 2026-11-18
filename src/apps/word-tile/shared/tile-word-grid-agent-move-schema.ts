import { z } from 'zod';

/** Platform structural tool id for tile-word-grid vs-AI turns (any game app). */
export const TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID = 'tile_word_grid_submit_move';

export const TILE_WORD_GRID_BOARD_LAST_INDEX = 14;

export const TileWordGridPlacementSchema = z.object({
  row: z
    .number()
    .int()
    .min(0)
    .max(TILE_WORD_GRID_BOARD_LAST_INDEX)
    .describe('Row index 0 (top) through 14 (bottom)'),
  col: z
    .number()
    .int()
    .min(0)
    .max(TILE_WORD_GRID_BOARD_LAST_INDEX)
    .describe('Column index 0 (left) through 14 (right)'),
  letter: z
    .string()
    .regex(/^[A-Za-z]$/, 'each placement needs a single letter A-Z')
    .describe('Single tile letter from your rack (A–Z)'),
});

export const TileWordGridAgentMoveSchema = z
  .object({
    type: z
      .enum(['place', 'pass', 'exchange', 'resign'])
      .describe('place = lay tiles; pass = skip (not on opening turn); exchange = swap rack tiles; resign = concede'),
    placements: z
      .array(TileWordGridPlacementSchema)
      .optional()
      .describe(
        'Required when type is place — one entry per NEW tile from your rack (empty cells only); same row OR same column; edge-connected to existing tiles; no gaps in that line',
      ),
    letters: z
      .array(z.string())
      .optional()
      .describe('Required when type is exchange — letters from your rack to return to the bag'),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'place' && !val.placements?.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'type "place" requires a non-empty placements array',
        path: ['placements'],
      });
    }
    if (val.type === 'exchange' && !val.letters?.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'type "exchange" requires letters from your rack',
        path: ['letters'],
      });
    }
    if (val.type === 'place' && val.letters?.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'type "place" uses placements only — omit the letters field (letters is for exchange)',
        path: ['letters'],
      });
    }
  });

export type TileWordGridAgentMove = z.infer<typeof TileWordGridAgentMoveSchema>;
