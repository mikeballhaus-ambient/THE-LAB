import type { MatchView } from '@/shared/game-platform/types';
import type { DetectBanterMomentFn } from '../types';
import { detectMatchEndBanterMoment } from '../match-end-moment';
import { composeBanterDetectors } from '../compose-detectors';

type ShotMap = Record<string, 'hit' | 'miss'>;

function hitCount(shots: ShotMap | undefined): number {
  if (!shots) {
    return 0;
  }
  return Object.values(shots).filter((v) => v === 'hit').length;
}

function detectBattleshipShot(prev: MatchView | null, next: MatchView): ReturnType<DetectBanterMomentFn> {
  if (!prev || next.status !== 'active') {
    return null;
  }
  const prevShotsAt = (prev.state as { shotsAt?: Record<number, ShotMap> })?.shotsAt ?? {};
  const nextShotsAt = (next.state as { shotsAt?: Record<number, ShotMap> })?.shotsAt ?? {};
  for (const seat of [1, 2] as const) {
    if (hitCount(nextShotsAt[seat]) > hitCount(prevShotsAt[seat])) {
      return {
        kind: 'hit',
        moverSeat: seat,
        detail:
          seat === 1
            ? 'Seat 1 salvo — new hit on opponent tracking grid (no coordinates in Sidecar speech)'
            : 'Seat 2 salvo — new hit on opponent tracking grid (no coordinates in Sidecar speech)',
      };
    }
  }
  return null;
}

export const detectBattleshipBanterMoment: DetectBanterMomentFn = composeBanterDetectors(
  detectMatchEndBanterMoment,
  detectBattleshipShot,
);
