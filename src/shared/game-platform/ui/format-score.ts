import type { ScoreKind } from '../types';

/**
 * Score display helpers (personal bests, head-to-head, result modals).
 *
 * `time-lower` renders as a clock (`1:23`) with moves as a suffix; points-kind
 * scores render as a plain rounded number.
 */
export function formatGameScorePrimary(scoreKind: ScoreKind, primaryValue: number): string {
  if (scoreKind === 'time-lower') {
    const totalSec = Math.max(0, Math.round(primaryValue / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  }
  return String(Math.round(primaryValue));
}

export function formatGameScoreDetail(
  scoreKind: ScoreKind,
  primaryValue: number,
  secondaryValue: number | null,
): string {
  const primary = formatGameScorePrimary(scoreKind, primaryValue);
  if (scoreKind === 'time-lower' && secondaryValue != null) {
    return `${primary} · ${Math.round(secondaryValue)} moves`;
  }
  return primary;
}
