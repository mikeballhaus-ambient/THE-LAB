/**
 * Objective completion is derived, not stored.
 *
 * `okr_objectives` has no status column — an objective is complete when every one of its key
 * results is `done`. The publisher compares that roll-up before and after a key-result write, so a
 * mid-stream edit stays silent and the event fires exactly once on entry to complete.
 *
 * Kept out of `server.ts` so the rule can be unit-tested without booting the app server.
 */
export interface KeyResultStatusValue {
  status: string;
}

export function isObjectiveComplete(keyResults: readonly KeyResultStatusValue[]): boolean {
  // No key results means nothing was ever set, so nothing was completed.
  return keyResults.length > 0 && keyResults.every((keyResult) => keyResult.status === 'done');
}
