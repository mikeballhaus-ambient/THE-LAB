/**
 * When a catalog game reuses its Dexie Sidecar tab for a new vs–Lab Assistant match id,
 * in-game banter from the prior match must not remain visible in the panel.
 */
export function labGameSidecarMatchChanged(
  previousMatchId: string | undefined,
  nextMatchId: string,
): boolean {
  const prev = previousMatchId?.trim();
  const next = nextMatchId.trim();
  return Boolean(prev && next && prev !== next);
}

/** Wipe Dexie thread when a reused game tab starts a new vs–AI match (incl. legacy rows missing lastMatchId). */
export function shouldResetLabGameSidecarThread(options: {
  previousMatchId?: string;
  nextMatchId: string;
  messageCount: number;
  hasGameSidecarBinding: boolean;
}): boolean {
  if (labGameSidecarMatchChanged(options.previousMatchId, options.nextMatchId)) {
    return true;
  }
  return (
    options.hasGameSidecarBinding &&
    options.messageCount > 0 &&
    !options.previousMatchId?.trim()
  );
}
