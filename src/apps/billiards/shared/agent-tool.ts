import {
  BILLIARDS_SUBMIT_SHOT_TOOL_ID,
  BilliardsAgentShotSchema,
} from './billiards-agent-move-schema';
import {
  BILLIARDS_PLACE_CUE_TOOL_ID,
  BilliardsAgentPlaceSchema,
} from './billiards-agent-place-schema';

/**
 * Billiards structural tool descriptor — registered at platform boot so the Lab
 * Assistant provider receives the tool schema on agent turns.
 */
export const BILLIARDS_AGENT_TOOL = {
  id: BILLIARDS_SUBMIT_SHOT_TOOL_ID,
  description:
    'Submit your pool shot. Use **pocket aimDeg** from the user AIM HINTS (ghost-ball line), not center-hit on cuts. ' +
    'Power 0.12–1.0; optional englishX / englishY (-1 to 1). Call once per turn.',
  params: BilliardsAgentShotSchema,
} as const;

export const BILLIARDS_PLACE_CUE_TOOL = {
  id: BILLIARDS_PLACE_CUE_TOOL_ID,
  description:
    'Place the cue ball after a foul (ball in hand). Pick table coordinates (x, y) in open space ' +
    '— kitchen fouls restrict y to the top quarter of the table; avoid overlapping other balls.',
  params: BilliardsAgentPlaceSchema,
} as const;

/** Purpose suffix scoping this tool to Billiards agent turns (`billiards.billiards.agent-turn`). */
export const BILLIARDS_AGENT_PURPOSE_SUFFIX = '.billiards.agent-turn';
