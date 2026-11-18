/** Shared copy for game agents — search informs the LLM; it does not auto-play. */
export const LLM_SEARCH_ADVISORY_HEADER =
  'LOCAL SEARCH HINTS (advisory only — you still choose exactly one legal move via the tool; lab owners compare LLMs using the same hints).';

export const LLM_SEARCH_ADVISORY_FOOTER =
  'Hints rank lines from your seat’s view after a local search — prefer stronger lines on hard/boss tiers, but the tool call is your decision.';

export function formatMinimaxScore(score: number, mateScore: number): string {
  if (score >= mateScore - 500) {
    return 'winning (search)';
  }
  if (score <= -(mateScore - 500)) {
    return 'losing (search)';
  }
  const cp = Math.round(score / 10) / 10;
  return cp >= 0 ? `+${cp}` : `${cp}`;
}
