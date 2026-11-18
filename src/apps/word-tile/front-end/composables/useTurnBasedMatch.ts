import { computed, onUnmounted, ref, watch } from 'vue';
import { TW_SOCKET_EVENTS } from '../../shared/types/socket-events';
import { isAiAgentTurnPending, useMatchPlayerTurns } from './useMatchPlayerTurns';
import { useWordTileSocket } from './useWordTileSocket';
import type { DetectBanterMomentFn } from '@/shared/game-platform/lab-assistant-banter/types';
import { detectWordTileBanterMoment } from '@/shared/game-platform/lab-assistant-banter/detectors';
import { createLabAssistantBanterHooks } from '@/shared/game-platform/lab-assistant-banter/on-match-update';
import type { GameDifficulty, MatchStatus, MatchView as PlatformMatchView } from '@/shared/game-platform/types';
import {
  clearLabSidecarGameMatchContext,
  syncLabSidecarHostContextForMatch,
} from '@/shared/composables/lab-sidecar/useLabSidecarGameSession';

export interface MatchView {
  matchId: string;
  gameId: string;
  status: MatchStatus;
  opponentKind: 'ai' | 'human';
  difficulty?: GameDifficulty | null;
  yourSeat: number;
  currentSeat: number;
  state: unknown;
  scores: Record<number, number>;
  turnRemainingMs: number;
  winnerUserId: number | null;
  player1Id?: number;
  player2Id?: number;
}

export function asPlatformMatchView(m: MatchView | null): PlatformMatchView | null {
  if (!m) {
    return null;
  }
  return m as PlatformMatchView;
}

/** Resolve winner seat from API fields (do not compare winnerUserId to client JWT). */
export function winnerSeatForMatch(m: MatchView): number | null {
  if (m.winnerUserId == null) {
    return null;
  }
  const winnerId = Number(m.winnerUserId);
  if (m.player1Id != null && winnerId === Number(m.player1Id)) {
    return 1;
  }
  if (m.player2Id != null && winnerId === Number(m.player2Id)) {
    return 2;
  }
  return null;
}

export type MatchOutcome = 'win' | 'loss' | 'draw';

export function outcomeForMatch(m: MatchView): MatchOutcome {
  const you = m.scores[m.yourSeat] ?? 0;
  const oppSeat = m.yourSeat === 1 ? 2 : 1;
  const opp = m.scores[oppSeat] ?? 0;
  const winnerSeat = winnerSeatForMatch(m);
  if (winnerSeat != null) {
    return winnerSeat === m.yourSeat ? 'win' : 'loss';
  }
  if (you > opp) {
    return 'win';
  }
  if (you === opp) {
    return 'draw';
  }
  return 'loss';
}

export function useTurnBasedMatch(
  serverUrl: string | (() => string),
  options?: {
    getOpponentDisplayName?: () => string;
    detectBanterMoment?: DetectBanterMomentFn;
  },
) {
  const resolveUrl = () => (typeof serverUrl === 'function' ? serverUrl() : serverUrl);
  const match = ref<MatchView | null>(null);
  const detectBanterMoment = options?.detectBanterMoment ?? detectWordTileBanterMoment;
  const banterHooks = createLabAssistantBanterHooks(detectBanterMoment, () =>
    asPlatformMatchView(match.value),
  );
  const loading = ref(false);
  const error = ref<string | null>(null);
  const twSocket = useWordTileSocket();
  const playerTurnsFeed = useMatchPlayerTurns(resolveUrl, twSocket);

  function ensureSocket(): void {
    const base = resolveUrl().replace(/\/$/, '');
    if (base) {
      twSocket.connect(base);
    }
  }

  async function maybeStreamAgentTurn(): Promise<void> {
    await playerTurnsFeed.streamAgentTurnIfNeeded(
      match.value,
      (next) => {
        const prev = match.value;
        applyMatchUpdate(prev, next);
      },
      {
        opponentDisplayName: options?.getOpponentDisplayName?.(),
      },
    );
  }

  function applyMatchUpdate(prev: MatchView | null, next: MatchView): void {
    match.value = next;
    syncLabSidecarHostContextForMatch(asPlatformMatchView(next));
    banterHooks.onAuthoritativeMatchUpdate(asPlatformMatchView(prev), asPlatformMatchView(next)!);
  }

  function applyMatchFromSocket(next: MatchView): void {
    if (!match.value || match.value.matchId !== next.matchId) {
      return;
    }
    const prev = match.value;
    applyMatchUpdate(prev, next);
    void maybeStreamAgentTurn();
  }

  let matchStateListener: ((payload: { matchId: string; match: MatchView }) => void) | null = null;

  function bindMatchStateListener(): void {
    ensureSocket();
    const sock = twSocket.getSocket();
    if (matchStateListener) {
      sock.off(TW_SOCKET_EVENTS.MATCH_STATE, matchStateListener);
    }
    matchStateListener = (payload: { matchId: string; match: MatchView }) => {
      if (payload?.match) {
        applyMatchFromSocket(payload.match);
      }
    };
    sock.on(TW_SOCKET_EVENTS.MATCH_STATE, matchStateListener);
  }

  watch(
    () => resolveUrl(),
    () => {
      try {
        bindMatchStateListener();
      } catch {
        // not connected yet
      }
    },
    { immediate: true },
  );

  watch(
    () => match.value,
    (m) => {
      banterHooks.onMatchWatch(asPlatformMatchView(m ?? null));
      syncLabSidecarHostContextForMatch(asPlatformMatchView(m ?? null));
      if (isAiAgentTurnPending(m)) {
        void maybeStreamAgentTurn();
      }
    },
  );

  async function load(matchId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      ensureSocket();
      bindMatchStateListener();
      if (match.value?.matchId !== matchId) {
        playerTurnsFeed.resetTurns();
      }
      const data = await twSocket.emitAck<{ match: MatchView }>(TW_SOCKET_EVENTS.MATCH_GET, {
        matchId,
      });
      applyMatchUpdate(match.value, data.match);
      await maybeStreamAgentTurn();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load match';
    } finally {
      loading.value = false;
    }
  }

  async function createAiMatch(
    gameId: string,
    difficulty: string,
    rules?: { wagerQuarks?: number },
  ): Promise<string> {
    ensureSocket();
    bindMatchStateListener();
    playerTurnsFeed.resetTurns();
    const data = await twSocket.emitAck<{ match: MatchView }>(TW_SOCKET_EVENTS.MATCH_CREATE_AI, {
      gameId,
      difficulty,
      wagerQuarks: rules?.wagerQuarks,
    });
    applyMatchUpdate(null, data.match);
    await maybeStreamAgentTurn();
    return data.match.matchId;
  }

  async function submitMove(move: Record<string, unknown>): Promise<void> {
    if (!match.value) {
      return;
    }
    ensureSocket();
    const prev = match.value;
    const data = await twSocket.emitAck<{ match: MatchView }>(TW_SOCKET_EVENTS.MATCH_MOVE, {
      matchId: match.value.matchId,
      move,
    });
    applyMatchUpdate(prev, data.match);
    playerTurnsFeed.syncTurnHistoryFromMatch(
      match.value,
      options?.getOpponentDisplayName?.() ?? 'AI',
    );
    await maybeStreamAgentTurn();
  }

  onUnmounted(() => {
    banterHooks.dispose();
    clearLabSidecarGameMatchContext();
    playerTurnsFeed.dispose();
  });

  const waitingForOpponent = computed(() => {
    const m = match.value;
    if (!m || m.status !== 'active') {
      return false;
    }
    return m.currentSeat !== m.yourSeat && !playerTurnsFeed.liveTurn.value;
  });

  return {
    match,
    loading,
    error,
    load,
    createAiMatch,
    submitMove,
    applyMatchFromSocket,
    maybeStreamAgentTurn,
    ensureSocket,
    twSocket,
    playerTurns: playerTurnsFeed.playerTurns,
    livePlayerTurn: playerTurnsFeed.liveTurn,
    agentStreamBusy: playerTurnsFeed.agentStreamBusy,
    agentResolvingMove: playerTurnsFeed.agentResolvingMove,
    waitingForOpponent,
    resetPlayerTurns: playerTurnsFeed.resetTurns,
  };
}
