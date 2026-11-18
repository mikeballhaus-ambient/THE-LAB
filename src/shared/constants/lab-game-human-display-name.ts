/** Fallback when the signed-in Lab user has no profile name. */
export const LAB_GAME_HUMAN_PLAYER_FALLBACK_LABEL = 'Human';

export function resolveLabGameHumanDisplayName(humanDisplayName?: string | null): string {
  const trimmed = humanDisplayName?.trim();
  return trimmed || LAB_GAME_HUMAN_PLAYER_FALLBACK_LABEL;
}
