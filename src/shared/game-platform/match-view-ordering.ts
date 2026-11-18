import type { MatchView } from './types';

export type MatchViewApplyDecision = 'apply' | 'drop' | 'noop';

export function shouldApplyMatchViewRevision(
  prev: MatchView | null,
  next: MatchView,
): MatchViewApplyDecision {
  if (prev && prev.matchId !== next.matchId) {
    return 'apply';
  }
  const prevRev = prev?.stateRevision;
  const nextRev = next.stateRevision;
  if (prev && prevRev != null && nextRev != null && nextRev < prevRev) {
    return 'drop';
  }
  if (prev && prevRev != null && nextRev != null && nextRev === prevRev) {
    if (JSON.stringify(prev.state) === JSON.stringify(next.state)) {
      return 'noop';
    }
  }
  return 'apply';
}
