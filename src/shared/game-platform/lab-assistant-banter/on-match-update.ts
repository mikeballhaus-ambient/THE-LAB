import type { MatchView } from '@/shared/game-platform/types';
import { readMatchTurnHistory } from '@/shared/game-platform/use-turn-based-match';
import { postLabAssistantGameBanter } from '@/shared/composables/lab-sidecar/post-lab-assistant-game-banter';
import { isLabGameBanterDisabled } from '@/shared/composables/lab-sidecar/lab-game-sidecar-preferences-state';
import { shouldEmitBanter, clearBanterRateLimit } from './banter-rate-limit';
import { registerSlowTurnBanterIdleBump } from './slow-turn-banter-idle-registry';
import type { DetectBanterMomentFn } from './types';

function humanTurnKey(m: MatchView): string {
  return `${m.matchId}|${m.currentSeat}|${readMatchTurnHistory(m.state).length}`;
}

/** Slow-turn nudge only after the human has had real clock time on this turn (not right after handoff). */
const SLOW_TURN_MIN_CLOCK_ELAPSED_MS = 50_000;

export interface LabAssistantBanterHooks {
  onAuthoritativeMatchUpdate(
    prev: MatchView | null,
    next: MatchView,
    options?: { skipMoment?: boolean },
  ): void;
  /** Moment-only path (e.g. after deferred opponent shot animation). */
  emitBanterMoment(prev: MatchView | null, next: MatchView): void;
  onMatchWatch(next: MatchView | null): void;
  dispose(): void;
}

/** Sidecar LLM table talk + slow-turn nudge for one mounted match composable. */
export function createLabAssistantBanterHooks(
  detectBanterMoment: DetectBanterMomentFn | undefined,
  getMatch: () => MatchView | null,
): LabAssistantBanterHooks {
  let slowTurnTimer: ReturnType<typeof setTimeout> | null = null;
  let slowTurnScheduledAtRemainingMs: number | null = null;
  let slowTurnNudgedKey = '';
  let lastMatchId: string | null = null;
  let unregisterSlowTurnIdleBump: (() => void) | null = null;
  let registeredSlowTurnBumpMatchId: string | null = null;

  function clearSlowTurnTimer(): void {
    if (slowTurnTimer !== null) {
      clearTimeout(slowTurnTimer);
      slowTurnTimer = null;
    }
  }

  function maybeEmitBanter(prev: MatchView | null, next: MatchView): void {
    if (isLabGameBanterDisabled()) {
      return;
    }
    if (!detectBanterMoment || next.opponentKind !== 'ai') {
      return;
    }
    const moment = detectBanterMoment(prev, next);
    if (!moment) {
      return;
    }
    if (!shouldEmitBanter(next.matchId, moment.kind)) {
      return;
    }
    postLabAssistantGameBanter({
      gameId: next.gameId,
      matchId: next.matchId,
      yourSeat: next.yourSeat,
      moment,
    });
  }

  function scheduleSlowTurnNudge(m: MatchView): void {
    clearSlowTurnTimer();
    if (!detectBanterMoment || m.opponentKind !== 'ai' || m.status !== 'active') {
      return;
    }
    if (m.currentSeat !== m.yourSeat) {
      return;
    }
    const key = humanTurnKey(m);
    if (slowTurnNudgedKey === key) {
      return;
    }
    slowTurnScheduledAtRemainingMs = Math.max(0, m.turnRemainingMs);
    const delayMs = 45_000 + Math.floor(Math.random() * 45_001);
    slowTurnTimer = setTimeout(() => {
      slowTurnTimer = null;
      if (isLabGameBanterDisabled()) {
        return;
      }
      const current = getMatch();
      if (!current || current.matchId !== m.matchId || humanTurnKey(current) !== key) {
        slowTurnScheduledAtRemainingMs = null;
        return;
      }
      const elapsedOnClock =
        slowTurnScheduledAtRemainingMs != null
          ? slowTurnScheduledAtRemainingMs - Math.max(0, current.turnRemainingMs)
          : 0;
      if (elapsedOnClock < SLOW_TURN_MIN_CLOCK_ELAPSED_MS) {
        slowTurnScheduledAtRemainingMs = null;
        scheduleSlowTurnNudge(current);
        return;
      }
      slowTurnScheduledAtRemainingMs = null;
      if (!shouldEmitBanter(current.matchId, 'slow_turn')) {
        return;
      }
      slowTurnNudgedKey = key;
      const ply = readMatchTurnHistory(current.state).length;
      postLabAssistantGameBanter({
        gameId: current.gameId,
        matchId: current.matchId,
        yourSeat: current.yourSeat,
        moment: { kind: 'slow_turn', detail: `ply-${ply}` },
      });
    }, delayMs);
  }

  function ensureSlowTurnIdleBumpRegistered(matchId: string): void {
    const trimmed = matchId.trim();
    if (!trimmed) {
      return;
    }
    if (registeredSlowTurnBumpMatchId === trimmed && unregisterSlowTurnIdleBump) {
      return;
    }
    unregisterSlowTurnIdleBump?.();
    registeredSlowTurnBumpMatchId = trimmed;
    unregisterSlowTurnIdleBump = registerSlowTurnBanterIdleBump(trimmed, () => {
      const current = getMatch();
      if (!current || current.matchId !== trimmed) {
        return;
      }
      scheduleSlowTurnNudge(current);
    });
  }

  return {
    onAuthoritativeMatchUpdate(prev, next, options) {
      lastMatchId = next.matchId;
      ensureSlowTurnIdleBumpRegistered(next.matchId);
      if (!options?.skipMoment) {
        maybeEmitBanter(prev, next);
      }
      scheduleSlowTurnNudge(next);
    },
    emitBanterMoment(prev, next) {
      maybeEmitBanter(prev, next);
    },
    onMatchWatch(next) {
      if (next?.matchId) {
        lastMatchId = next.matchId;
        ensureSlowTurnIdleBumpRegistered(next.matchId);
      }
      if (next) {
        scheduleSlowTurnNudge(next);
      } else {
        clearSlowTurnTimer();
      }
    },
    dispose() {
      if (lastMatchId) {
        clearBanterRateLimit(lastMatchId);
      }
      unregisterSlowTurnIdleBump?.();
      unregisterSlowTurnIdleBump = null;
      registeredSlowTurnBumpMatchId = null;
      clearSlowTurnTimer();
      slowTurnNudgedKey = '';
      slowTurnScheduledAtRemainingMs = null;
      lastMatchId = null;
    },
  };
}
