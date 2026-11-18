import {
  TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID,
  TileWordGridAgentMoveSchema,
} from './tile-word-grid-agent-move-schema';

/**
 * Word Tile's structural tool descriptor.
 *
 * The provider needs only this — `id`, `description`, Zod `params`. `execute` is
 * never invoked: the move is graded by `back-end/rules.ts` via the adapter's
 * `structuralTool.grade`, not by the platform. Core registers it with
 * `registerStructuralToolFromApp()`, so the schema stays app-owned and core
 * imports nothing game-specific.
 */
export const WORD_TILE_AGENT_TOOL = {
  id: TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID,
  description:
    'Submit your Tile Word Grid turn. type: "place" (placements with row, col, letter), "pass" (skip turn when you cannot play — not on opening turn), "exchange" (letters: tiles from rack to swap when bag has tiles), or "resign".',
  params: TileWordGridAgentMoveSchema,
} as const;

/** Purpose suffix that scopes this tool to Word Tile's agent turns. */
export const WORD_TILE_AGENT_PURPOSE_SUFFIX = '.tile-word-grid.agent-turn';
