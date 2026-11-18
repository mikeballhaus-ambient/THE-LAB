import { z } from 'zod';

/** Structural tool id for Chess vs-AI turns. */
export const CHESS_SUBMIT_MOVE_TOOL_ID = 'chess_submit_move';

/**
 * Row 0 is Black's back rank (rank 8), row 7 is White's back rank (rank 1);
 * col 0 is the a-file, col 7 the h-file.
 */
export const ChessAgentMoveSchema = z.object({
  fromRow: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Origin row: 0 = rank 8 (Black back rank), 7 = rank 1 (White back rank).'),
  fromCol: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Origin column: 0 = file a, 7 = file h.'),
  toRow: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Destination row, same numbering as fromRow.'),
  toCol: z
    .number()
    .int()
    .min(0)
    .max(7)
    .describe('Destination column, same numbering as fromCol.'),
  promotion: z
    .enum(['queen', 'rook', 'bishop', 'knight'])
    .optional()
    .describe(
      'Only for a pawn moving to its last rank. Omit otherwise. ' +
        'Choose from queen (usually best), rook, bishop or knight.',
    ),
});

export type ChessAgentMove = z.infer<typeof ChessAgentMoveSchema>;
