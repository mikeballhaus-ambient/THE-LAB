import type { GameDifficulty } from '@/shared/game-platform/types';

/** Per-tier reminder in the user prompt — hints advise; the structural tool call is authoritative. */
export const BILLIARDS_TIER_EXECUTION_NOTE: Partial<Record<GameDifficulty, string>> = {
  easy:
    'Shot authority: **you** choose angleDeg, power, and which ball to play. AIM HINTS are suggestions — your tool call is applied as submitted if it hits a legal object.',
  medium:
    'Shot authority: **you** decide among RECOMMENDED and listed alternates. Hints do not auto-play; copy pocket aimDeg when you agree with a line.',
  hard:
    'Shot authority: **you** must submit the shot you want. Use EASY MAKE / MAKABLE tags to pick lines; missing makable shots is on the model, not the server.',
  boss:
    'Shot authority: **you** choose the line and submit the tool call — the server never rewrites angleDeg or power. Use 1-decimal pocket aimDeg from hints; on cuts, never submit center-hit.',
};

export function billiardsDifficultyExecutionNote(difficulty: GameDifficulty): string | null {
  return BILLIARDS_TIER_EXECUTION_NOTE[difficulty] ?? null;
}
