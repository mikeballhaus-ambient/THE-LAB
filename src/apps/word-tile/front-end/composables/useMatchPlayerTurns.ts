import { ref } from 'vue';

import { TW_SOCKET_EVENTS } from '../../shared/types/socket-events';

import { twAgentStreamDebugClient } from '@/shared/utils/agent-stream-debug.client';

import type { PlatformLlmStreamDeltaPayload } from '@/shared/types/platform-llm-completion';

import type { MatchView } from './useTurnBasedMatch';

import type { useWordTileSocket } from './useWordTileSocket';

const RESOLVING_IDLE_MS = 900;
const AGENT_ATTEMPT_NOTE_SEP = '\n';

import type { PlayerTurn } from '@/shared/game-platform/ui/player-turn';

/**
 * Word Tile's turn row.
 *
 * Structurally the shared kit `PlayerTurn`, with `text` kept as the app's local
 * name for the summary line so existing render code does not change. Declaring it
 * as an extension of the kit type means `PlayerTurnsPanel` accepts both.
 */
export interface MatchPlayerTurn extends PlayerTurn {
  /** Local alias of `summary`. */
  text: string;
}

type TurnHistoryEntry = { seat: number; summary: string };

/** PlayerTurnsPanel reads `summary` / `moveSummary`; keep `text` as Word Tile alias. */
function committedTurnCopy(summary: string): Pick<MatchPlayerTurn, 'text' | 'summary' | 'moveSummary'> {
  const line = summary.trim();
  return { text: line, summary: line, moveSummary: line };
}

function readTurnHistory(state: unknown): TurnHistoryEntry[] {
  const raw = (state as { turnHistory?: TurnHistoryEntry[] } | null)?.turnHistory;
  return Array.isArray(raw) ? raw : [];
}

function seatLabel(
  seat: number,
  yourSeat: number,
  opponentKind: 'ai' | 'human',
  opponentDisplayName: string,
): { label: string; isYou: boolean } {
  if (seat === yourSeat) {
    return { label: 'You', isYou: true };
  }
  if (opponentKind === 'ai') {
    return { label: opponentDisplayName || 'AI', isYou: false };
  }
  return { label: opponentDisplayName || 'Opponent', isYou: false };
}

export function isAiAgentTurnPending(match: MatchView | null): boolean {
  if (!match) {
    return false;
  }
  return (
    match.opponentKind === 'ai' &&
    match.status === 'active' &&
    match.currentSeat !== match.yourSeat
  );
}

export function useMatchPlayerTurns(
  getBaseUrl: () => string,
  twSocket: ReturnType<typeof useWordTileSocket>,
) {
  const playerTurns = ref<MatchPlayerTurn[]>([]);
  const liveTurn = ref<MatchPlayerTurn | null>(null);
  const agentStreamBusy = ref(false);
  const agentResolvingMove = ref(false);

  let streamPromise: Promise<void> | null = null;
  let activeMatchId: string | null = null;
  let resolvingIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let syncedHistoryLength = 0;
  let syncMatchId: string | null = null;
  /** One dashed bubble per AI turn — append failed tries with {@link AGENT_ATTEMPT_NOTE_SEP}. */
  let activeAttemptBubbleId: string | null = null;

  function clearResolvingIdleTimer(): void {
    if (resolvingIdleTimer != null) {
      clearTimeout(resolvingIdleTimer);
      resolvingIdleTimer = null;
    }
  }

  function scheduleResolvingCheck(): void {
    clearResolvingIdleTimer();
    resolvingIdleTimer = setTimeout(() => {
      if (agentStreamBusy.value) {
        agentResolvingMove.value = true;
      }
    }, RESOLVING_IDLE_MS);
  }

  function resetTurns(): void {
    playerTurns.value = [];
    liveTurn.value = null;
    agentResolvingMove.value = false;
    syncedHistoryLength = 0;
    syncMatchId = null;
    activeAttemptBubbleId = null;
    clearResolvingIdleTimer();
  }

  function syncTurnHistoryFromMatch(
    match: MatchView | null,
    opponentDisplayName = 'Opponent',
  ): void {
    if (!match) {
      return;
    }
    if (syncMatchId !== match.matchId) {
      syncMatchId = match.matchId;
      syncedHistoryLength = 0;
      playerTurns.value = [];
    }
    const history = readTurnHistory(match.state);
    if (history.length <= syncedHistoryLength) {
      return;
    }
    for (let i = syncedHistoryLength; i < history.length; i++) {
      const entry = history[i]!;
      const { label, isYou } = seatLabel(
        entry.seat,
        match.yourSeat,
        match.opponentKind,
        opponentDisplayName,
      );
      playerTurns.value.push({
        id: `${match.matchId}-turn-${i}`,
        seat: entry.seat,
        playerLabel: label,
        isYou,
        ...committedTurnCopy(entry.summary),
        streaming: false,
      });
    }
    syncedHistoryLength = history.length;
  }

  function appendAgentAttemptBubble(
    match: MatchView,
    opponentDisplayName: string,
    note: string,
  ): void {
    const trimmed = note.trim();
    if (!trimmed) {
      return;
    }
    if (activeAttemptBubbleId) {
      const idx = playerTurns.value.findIndex((t) => t.id === activeAttemptBubbleId);
      if (idx >= 0) {
        const row = playerTurns.value[idx]!;
        const prior =
          row.rejectedAttemptNotes ??
          (row.isAttempt ? row.text : '');
        playerTurns.value[idx] = {
          ...row,
          rejectedAttemptNotes: prior
            ? `${prior}${AGENT_ATTEMPT_NOTE_SEP}${trimmed}`
            : trimmed,
          text: '',
          isAttempt: true,
        };
        return;
      }
      activeAttemptBubbleId = null;
    }
    const seat = match.currentSeat;
    const { label, isYou } = seatLabel(
      seat,
      match.yourSeat,
      match.opponentKind,
      opponentDisplayName,
    );
    const id = `tw-attempt-${match.matchId}-${Date.now()}`;
    activeAttemptBubbleId = id;
    playerTurns.value.push({
      id,
      seat,
      playerLabel: label,
      isYou,
      text: '',
      rejectedAttemptNotes: trimmed,
      streaming: false,
      isAttempt: true,
    });
  }

  function beginLiveOpponentTurn(
    match: MatchView,
    opponentDisplayName: string,
  ): void {
    const seat = match.currentSeat;
    const { label, isYou } = seatLabel(
      seat,
      match.yourSeat,
      match.opponentKind,
      opponentDisplayName,
    );
    activeAttemptBubbleId = null;
    liveTurn.value = {
      id: `tw-live-${Date.now()}`,
      seat,
      playerLabel: label,
      isYou,
      text: 'Choosing a move…',
      streaming: true,
    };
    scheduleResolvingCheck();
  }

  function clearLiveTurn(): void {
    liveTurn.value = null;
  }

  /** Keep a failed or orphan live bubble in the feed (do not drop silently). */
  function commitLiveTurnToFeed(message: string): void {
    const turn = liveTurn.value;
    if (!turn) {
      return;
    }
    playerTurns.value.push({
      ...turn,
      id: `${turn.id}-done`,
      ...committedTurnCopy(message.trim() || 'Turn failed.'),
      streaming: false,
    });
    liveTurn.value = null;
  }

  function finalizeAgentTurnDone(
    data: { match?: MatchView; agentMoveSummary?: string },
    opponentDisplayName: string,
    onMatchState: (m: MatchView) => void,
  ): void {
    const pendingAttemptId = activeAttemptBubbleId;
    activeAttemptBubbleId = null;
    const historyBefore = syncedHistoryLength;

    if (data.match) {
      const history = readTurnHistory(data.match.state);
      const hasNewHistory = history.length > historyBefore;
      const finalSummary =
        data.agentMoveSummary?.trim() ||
        (hasNewHistory ? history[history.length - 1]?.summary?.trim() : undefined);

      const attemptIdx =
        pendingAttemptId != null
          ? playerTurns.value.findIndex((t) => t.id === pendingAttemptId)
          : playerTurns.value.findIndex((t) => t.isAttempt);

      if (attemptIdx >= 0 && finalSummary) {
        const row = playerTurns.value[attemptIdx]!;
        const rejectedAttemptNotes =
          row.rejectedAttemptNotes ??
          (row.isAttempt && row.text ? row.text : undefined);
        playerTurns.value[attemptIdx] = {
          ...row,
          rejectedAttemptNotes,
          ...committedTurnCopy(finalSummary),
          isAttempt: false,
        };
        if (hasNewHistory) {
          syncedHistoryLength = history.length;
          syncMatchId = data.match.matchId;
        }
        clearLiveTurn();
        onMatchState(data.match);
        return;
      }

      if (hasNewHistory) {
        syncTurnHistoryFromMatch(data.match, opponentDisplayName);
      } else if (finalSummary) {
        commitLiveTurnToFeed(finalSummary);
      } else {
        commitLiveTurnToFeed(
          'Opponent turn finished but no move was recorded. Try refreshing the match.',
        );
      }
      clearLiveTurn();
      onMatchState(data.match);
      return;
    }

    if (data.agentMoveSummary?.trim()) {
      commitLiveTurnToFeed(data.agentMoveSummary);
      return;
    }
    commitLiveTurnToFeed('Opponent turn finished but no move was recorded. Try refreshing the match.');
  }

  async function streamAgentTurnIfNeeded(
    match: MatchView | null,
    onMatch: (m: MatchView) => void,
    options?: { opponentDisplayName?: string },
  ): Promise<void> {
    const opponentDisplayName = options?.opponentDisplayName ?? 'AI';
    if (match) {
      syncTurnHistoryFromMatch(match, opponentDisplayName);
    }

    if (!match || !isAiAgentTurnPending(match)) {
      twAgentStreamDebugClient('skip stream', {
        hasMatch: Boolean(match),
        pending: match ? isAiAgentTurnPending(match) : false,
        busy: agentStreamBusy.value,
      });
      return;
    }

    if (streamPromise && activeMatchId === match.matchId) {
      twAgentStreamDebugClient('join in-flight stream', { matchId: match.matchId });
      return streamPromise;
    }

    activeMatchId = match.matchId;
    agentStreamBusy.value = true;
    agentResolvingMove.value = false;
    beginLiveOpponentTurn(match, opponentDisplayName);

    const turnStartedAt = Date.now();
    twAgentStreamDebugClient('socket agent-turn start (batch)', { matchId: match.matchId });

    streamPromise = (async () => {
      try {
        twSocket.connect(getBaseUrl());
        const sock = twSocket.getSocket();

        await new Promise<void>((resolve, reject) => {
          const onDelta = (data: PlatformLlmStreamDeltaPayload) => {
            const note = data.agentAttemptNote?.trim();
            if (note) {
              appendAgentAttemptBubble(match, opponentDisplayName, note);
            }
          };

          const stopDeltas = () => {
            sock.off(TW_SOCKET_EVENTS.MATCH_AGENT_DELTA, onDelta);
          };

          const onDone = (data: {
            match?: MatchView;
            agentNote?: string;
            agentMoveSummary?: string;
          }) => {
            stopDeltas();
            twAgentStreamDebugClient('socket agent-turn done', {
              elapsedMs: Date.now() - turnStartedAt,
            });
            finalizeAgentTurnDone(data, opponentDisplayName, onMatch);
            resolve();
          };

          const onError = (data: { error?: string }) => {
            stopDeltas();
            const message = data.error ?? 'Agent turn failed';
            twAgentStreamDebugClient('socket agent-turn error', { error: message });
            commitLiveTurnToFeed(`Could not play: ${message}`);
            reject(new Error(message));
          };

          sock.on(TW_SOCKET_EVENTS.MATCH_AGENT_DELTA, onDelta);
          sock.once(TW_SOCKET_EVENTS.MATCH_AGENT_DONE, onDone);
          sock.once(TW_SOCKET_EVENTS.MATCH_ERROR, onError);
          sock.emit(TW_SOCKET_EVENTS.MATCH_AGENT_TURN, { matchId: match.matchId });
        });
      } catch (e) {
        twAgentStreamDebugClient('socket agent-turn failed', {
          message: e instanceof Error ? e.message : String(e),
          elapsedMs: Date.now() - turnStartedAt,
        });
        const message = e instanceof Error ? e.message : 'Agent turn failed';
        commitLiveTurnToFeed(`Could not play: ${message}`);
      } finally {
        agentStreamBusy.value = false;
        agentResolvingMove.value = false;
        clearResolvingIdleTimer();
        if (activeMatchId === match.matchId) {
          activeMatchId = null;
        }
        streamPromise = null;
      }
    })();

    return streamPromise;
  }

  function dispose(): void {
    streamPromise = null;
    activeMatchId = null;
    agentResolvingMove.value = false;
    clearResolvingIdleTimer();
  }

  return {
    playerTurns,
    liveTurn,
    agentStreamBusy,
    agentResolvingMove,
    streamAgentTurnIfNeeded,
    syncTurnHistoryFromMatch,
    resetTurns,
    dispose,
  };
}
