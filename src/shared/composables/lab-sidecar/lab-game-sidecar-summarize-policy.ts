/** Context % (from session record) that triggers compaction when starting a new match on a reused tab. */
export const LAB_GAME_SIDECAR_SUMMARIZE_CONTEXT_PERCENT = 45;

/** Minimum Dexie messages before a match-boundary summarize is considered. */
export const LAB_GAME_SIDECAR_SUMMARIZE_MIN_MESSAGES = 10;

/** Message count alone can trigger summarize on a new match (heavy banter tabs). */
export const LAB_GAME_SIDECAR_SUMMARIZE_MESSAGE_COUNT = 24;

export function shouldSummarizeLabGameSidecarOnNewMatch(options: {
  previousMatchId: string | undefined;
  nextMatchId: string;
  contextUsedPercent: number;
  messageCount: number;
}): boolean {
  const prev = options.previousMatchId?.trim();
  const next = options.nextMatchId.trim();
  if (!next || !prev || prev === next) {
    return false;
  }
  if (options.messageCount < LAB_GAME_SIDECAR_SUMMARIZE_MIN_MESSAGES) {
    return false;
  }
  if (options.contextUsedPercent >= LAB_GAME_SIDECAR_SUMMARIZE_CONTEXT_PERCENT) {
    return true;
  }
  return options.messageCount >= LAB_GAME_SIDECAR_SUMMARIZE_MESSAGE_COUNT;
}
