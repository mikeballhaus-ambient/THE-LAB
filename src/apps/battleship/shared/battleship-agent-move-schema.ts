import { z } from 'zod';

/** Structural tool id for Battleship vs-AI turns. */
export const BATTLESHIP_SUBMIT_MOVE_TOOL_ID = 'battleship_submit_move';

export const BattleshipAgentMoveSchema = z.object({
  row: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe(
      'Row 0-7 on the ENEMY board (0 = top). Your own board only shows incoming shots — ' +
        'fire at the enemy grid, never at your own ships.',
    ),
  col: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Column 0-7 on the ENEMY board (0 = left).'),
});

export type BattleshipAgentMove = z.infer<typeof BattleshipAgentMoveSchema>;
