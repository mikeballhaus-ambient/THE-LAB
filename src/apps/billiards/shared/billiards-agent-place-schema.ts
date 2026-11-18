import { z } from 'zod';

export const BILLIARDS_PLACE_CUE_TOOL_ID = 'billiards_place_cue';

export const BilliardsAgentPlaceSchema = z.object({
  x: z
    .number()
    .min(0)
    .max(1000)
    .describe('Cue ball X on the table (0 = left cushion, 1000 = right).'),
  y: z
    .number()
    .min(0)
    .max(500)
    .describe('Cue ball Y on the table (0 = top cushion, 500 = bottom).'),
});

export type BilliardsAgentPlace = z.infer<typeof BilliardsAgentPlaceSchema>;
