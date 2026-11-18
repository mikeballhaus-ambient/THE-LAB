import { z } from 'zod';

export const BILLIARDS_SUBMIT_SHOT_TOOL_ID = 'billiards_submit_shot';

export const BilliardsAgentShotSchema = z.object({
  angleDeg: z
    .number()
    .min(0)
    .max(360)
    .describe(
      'Cue aim in degrees (0° = right rail, 90° = bottom). Use **pocket aimDeg** from AIM HINTS — on cuts this differs from center-hit toward the object ball.',
    ),
  power: z
    .number()
    .min(0.12)
    .max(1)
    .describe('Shot strength from 0.12 (soft) to 1.0 (firm).'),
  englishX: z
    .number()
    .min(-1)
    .max(1)
    .optional()
    .describe('Side spin: -1 left, +1 right (optional, default 0).'),
  englishY: z
    .number()
    .min(-1)
    .max(1)
    .optional()
    .describe('Follow/draw: -1 follow, +1 draw (optional, default 0).'),
});

export type BilliardsAgentShot = z.infer<typeof BilliardsAgentShotSchema>;
