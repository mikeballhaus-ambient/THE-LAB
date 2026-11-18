/**
 * Generic turn-based match composable for a catalog game front-end.
 *
 * Replaces Word Tile's `useTurnBasedMatch.ts` + `useMatchPlayerTurns.ts` with a
 * single self-contained store that:
 *  - loads/creates matches over the app socket (ack-wrapped)
 *  - applies authoritative `match:state` pushes (human PvP)
 *  - auto-runs AI agent turns via `match:agent-turn` and consumes
 *    `match:agent-delta` / `match:agent-done` / `match:error`
 */
import { computed, onUnmounted, ref, watch } from 'vue';
import type { PlatformLlmStreamDeltaPayload } from '@/shared/types/platform-llm-completion';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import {
  clearLabSidecarGameMatchContext,
  syncLabSidecarHostContextForMatch,
} from '@/shared/composables/lab-sidecar/useLabSidecarGameSession';
import { createLabAssistantBanterHooks } from '@/shared/game-platform/lab-assistant-banter/on-match-update';
import type { DetectBanterMomentFn } from '@/shared/game-platform/lab-assistant-banter/types';
import { useGameSocket } from './client-socket';
import type { GameDifficulty, GamePlatformConfig, MatchView } from './types';
import { shouldApplyMatchViewRevision } from './match-view-ordering';

export type MatchOutcome = 'win' | 'loss' | 'draw';

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

export function outcomeForMatch(m: MatchView): MatchOutcome {
  const winnerSeat = winnerSeatForMatch(m);
  if (winnerSeat != null) {
    return winnerSeat === m.yourSeat ? 'win' : 'loss';
  }
  // Finished with no winner is a draw — do NOT infer a winner from `scores`,
  // which some games use for per-cell counts (e.g. Tic-Tac-Toe X/O marks).
  if (m.status === 'finished') {
    return 'draw';
  }
  const you = m.scores[m.yourSeat] ?? 0;
  const oppSeat = m.yourSeat === 1 ? 2 : 1;
  const opp = m.scores[oppSeat] ?? 0;
  if (you > opp) {
    return 'win';
  }
  if (you < opp) {
    return 'loss';
  }
  return 'draw';
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

export interface UseTurnBasedMatchOptions {
  serverUrl: string | (() => string);
  config: Pick<GamePlatformConfig, 'appSlug' | 'socketEvents'>;
  getOpponentDisplayName?: () => string;
  /**
   * When the server match view arrives without a longer `state.turnHistory` (stale
   * app process, legacy row, etc.), append this line to the player-turns feed.
   */
  summarizeMoveForFeed?: (move: Record<string, unknown>, match: MatchView) => string | undefined;
  /**
   * Optional filter on `state.turnHistory` rows before they appear in `playerTurns`
   * (e.g. billiards — pockets, fouls, and group claims only).
   */
  filterPlayerTurn?: (entry: MatchTurnHistoryEntry) => boolean;
  /**
   * Optional rewrite of {@link MatchTurnHistoryEntry.summary} before it appears in
   * {@link playerTurns} (e.g. billiards — `for seat 1` → lab display name).
   */
  formatTurnSummary?: (summary: string, match: MatchView, seat: number) => string;
  /**
   * When true (e.g. billiards opponent shot replay still playing), defer Sidecar LLM
   * banter until {@link flushDeferredBanter} runs.
   */
  deferBanterWhile?: () => boolean;
  /**
   * When true (e.g. billiards opponent shot replay in progress), wait before requesting
   * the next Lab Assistant turn so back-to-back agent shots do not stack invisibly.
   */
  deferAgentTurnWhile?: () => boolean;
  /** Moment-driven Sidecar banter during vs–Lab Assistant play (LLM table talk via labGameBanter). */
  detectBanterMoment?: DetectBanterMomentFn;
}

export interface MatchTurnHistoryEntry {
  seat: number;
  summary: string;
}

export function readMatchTurnHistory(state: unknown): MatchTurnHistoryEntry[] {
  if (!state || typeof state !== 'object') {
    return [];
  }
  const raw = (state as { turnHistory?: unknown }).turnHistory;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (entry): entry is MatchTurnHistoryEntry =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as MatchTurnHistoryEntry).summary === 'string' &&
      typeof (entry as MatchTurnHistoryEntry).seat === 'number',
  );
}

function seatLabel(
  m: MatchView,
  seat: number,
  getOpponentDisplayName: (() => string) | undefined,
): string {
  if (seat === 0) {
    return 'House';
  }
  if (seat === m.yourSeat) {
    return 'You';
  }
  return getOpponentDisplayName?.() ?? (m.opponentKind === 'ai' ? LAB_ASSISTANT_GAME_OPPONENT_LABEL : 'Opponent');
}

function mapHistoryToPlayerTurns(
  m: MatchView,
  history: MatchTurnHistoryEntry[],
  getOpponentDisplayName: (() => string) | undefined,
  formatTurnSummary: UseTurnBasedMatchOptions['formatTurnSummary'],
): PlayerTurn[] {
  return history.map((entry, i) => {
    const isYou = entry.seat === m.yourSeat;
    const summary = formatTurnSummary?.(entry.summary, m, entry.seat) ?? entry.summary;
    return {
      id: `${m.matchId}-turn-${i}`,
      seat: entry.seat,
      isYou,
      playerLabel: seatLabel(m, entry.seat, getOpponentDisplayName),
      summary,
      moveSummary: summary,
    };
  });
}

/** One row in the generic player-turns feed, derived from `state.turnHistory`. */
export interface PlayerTurn {
  id: string;
  seat: number;
  playerLabel: string;
  isYou: boolean;
  summary: string;
  moveSummary?: string;
}

export function useTurnBasedMatch(options: UseTurnBasedMatchOptions) {
  const {
    config,
    getOpponentDisplayName,
    summarizeMoveForFeed,
    filterPlayerTurn,
    formatTurnSummary,
    deferBanterWhile,
    deferAgentTurnWhile,
    detectBanterMoment,
  } = options;
  let pendingBanterMoment: { prev: MatchView | null; next: MatchView } | null = null;
  const resolveUrl = () =>
    typeof options.serverUrl === 'function' ? options.serverUrl() : options.serverUrl;
  const socket = useGameSocket(config);
  const ev = config.socketEvents;

  const match = ref<MatchView | null>(null);
  const banterHooks = createLabAssistantBanterHooks(detectBanterMoment, () => match.value);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const agentStreamBusy = ref(false);
  /** True from socket emit until done/error — blocks a racing second `matchAgentTurn` emit. */
  const agentTurnEmitInFlight = ref(false);
  const agentStreamText = ref('');
  /** Patches when authoritative history did not grow after a move (legacy server / stale row). */
  const patchedTurns = ref<PlayerTurn[]>([]);
  let patchedForMatchId = '';
  let disposed = false;
  let turnExpireTimer: ReturnType<typeof setTimeout> | null = null;
  let turnExpireRefreshInFlight = false;
  /** Coalesces parallel `maybeStreamAgentTurn` callers (watch + done + refresh) into one emit. */
  let streamAgentTurnDispatch: Promise<void> | null = null;
  /** Randomized "thinking" pause so fast agent replies don't move instantly. */
  function agentTurnDelayMs(): number {
    return 1000 + Math.floor(Math.random() * 501); // 1000–1500 ms
  }

  function clearTurnExpireTimer(): void {
    if (turnExpireTimer !== null) {
      clearTimeout(turnExpireTimer);
      turnExpireTimer = null;
    }
  }

  async function refreshMatch(): Promise<void> {
    const current = match.value;
    if (!current?.matchId || turnExpireRefreshInFlight) {
      return;
    }
    turnExpireRefreshInFlight = true;
    try {
      ensureSocket();
      const data = await socket.emitAck<{ match: MatchView }>(ev.matchGet, {
        matchId: current.matchId,
      });
      applyAuthoritativeMatch(data.match);
      await maybeStreamAgentTurn();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to refresh match';
    } finally {
      turnExpireRefreshInFlight = false;
      scheduleTurnExpireRefresh();
    }
  }

  function scheduleTurnExpireRefresh(): void {
    clearTurnExpireTimer();
    const m = match.value;
    if (!m || m.status !== 'active') {
      return;
    }
    const ms = m.turnRemainingMs;
    if (ms <= 0) {
      void refreshMatch();
      return;
    }
    turnExpireTimer = setTimeout(() => {
      turnExpireTimer = null;
      void refreshMatch();
    }, ms + 150);
  }

  function resetPatchesForMatch(matchId: string): void {
    if (matchId !== patchedForMatchId) {
      patchedForMatchId = matchId;
      patchedTurns.value = [];
    }
  }

  function mergeDeferredBanterMoment(
    current: { prev: MatchView | null; next: MatchView } | null,
    incoming: { prev: MatchView | null; next: MatchView },
  ): { prev: MatchView | null; next: MatchView } {
    if (!current) {
      return incoming;
    }
    if (current.next.status === 'finished') {
      return current;
    }
    if (incoming.next.status === 'finished') {
      return { prev: current.prev ?? incoming.prev, next: incoming.next };
    }
    return incoming;
  }

  function flushPendingBanterMoment(): void {
    if (!pendingBanterMoment) {
      return;
    }
    const bypassDeferForMatchEnd = pendingBanterMoment.next.status === 'finished';
    if (deferBanterWhile?.() && !bypassDeferForMatchEnd) {
      return;
    }
    const { prev, next } = pendingBanterMoment;
    pendingBanterMoment = null;
    banterHooks.emitBanterMoment(prev, next);
  }

  function appendPatchTurn(m: MatchView, seat: number, rawSummary: string): void {
    const text = rawSummary.trim();
    if (!text) {
      return;
    }
    resetPatchesForMatch(m.matchId);
    const line = formatTurnSummary?.(text, m, seat) ?? text;
    patchedTurns.value = [
      ...patchedTurns.value,
      {
        id: `${m.matchId}-patch-${patchedTurns.value.length}`,
        seat,
        isYou: seat === m.yourSeat,
        playerLabel: seatLabel(m, seat, getOpponentDisplayName),
        summary: line,
        moveSummary: line,
      },
    ];
  }

  function applyAuthoritativeMatch(
    next: MatchView,
    opts?: { agentMoveSummary?: string; pendingMove?: Record<string, unknown> },
  ): void {
    const prev = match.value;
    const decision = shouldApplyMatchViewRevision(prev, next);
    if (decision === 'drop' || decision === 'noop') {
      return;
    }
    const prevLen = prev ? readMatchTurnHistory(prev.state).length : 0;
    match.value = next;
    syncLabSidecarHostContextForMatch(next);
    resetPatchesForMatch(next.matchId);
    const nextLen = readMatchTurnHistory(next.state).length;
    if (nextLen > prevLen) {
      patchedTurns.value = [];
    } else if (opts?.pendingMove && summarizeMoveForFeed) {
      const summary = summarizeMoveForFeed(opts.pendingMove, prev ?? next);
      if (summary) {
        appendPatchTurn(next, (prev ?? next).yourSeat, summary);
      }
    } else if (opts?.agentMoveSummary?.trim()) {
      // `matchAgentDone` can race `matchMove` ack after the server already appended turnHistory.
      // Do not add a synthetic feed row when history grew on this update.
      const agentSummary = opts.agentMoveSummary.trim();
      const aiSeat = next.yourSeat === 1 ? 2 : 1;
      const hist = readMatchTurnHistory(next.state);
      const last = hist.at(-1);
      if (last?.seat === aiSeat) {
        // Authoritative history already describes this agent stroke.
      } else {
        appendPatchTurn(next, aiSeat, agentSummary);
      }
    }
    if (deferBanterWhile?.()) {
      pendingBanterMoment = mergeDeferredBanterMoment(pendingBanterMoment, { prev, next });
      banterHooks.onAuthoritativeMatchUpdate(prev, next, { skipMoment: true });
    } else {
      flushPendingBanterMoment();
      banterHooks.onAuthoritativeMatchUpdate(prev, next);
    }
  }

  function flushDeferredBanter(): void {
    flushPendingBanterMoment();
  }

  const turnHistorySignature = computed(() => {
    const m = match.value;
    if (!m) {
      return '';
    }
    const history = readMatchTurnHistory(m.state);
    return `${m.matchId}|${history.length}|${history.map((e) => `${e.seat}:${e.summary}`).join('\n')}|${patchedTurns.value.length}`;
  });

  /**
   * Generic move-by-move feed built from the authoritative `state.turnHistory`
   * that every game adapter appends to. Gives players insight into match activity.
   */
  const playerTurns = computed<PlayerTurn[]>(() => {
    void turnHistorySignature.value;
    const m = match.value;
    if (!m) {
      return [];
    }
    const rawHistory = readMatchTurnHistory(m.state);
    const history = filterPlayerTurn ? rawHistory.filter(filterPlayerTurn) : rawHistory;
    const fromHistory = mapHistoryToPlayerTurns(m, history, getOpponentDisplayName, formatTurnSummary);
    const patches = filterPlayerTurn
      ? patchedTurns.value.filter((t) => filterPlayerTurn({ seat: t.seat, summary: t.summary }))
      : patchedTurns.value;
    if (fromHistory.length === 0) {
      return [...patches];
    }
    if (patches.length === 0) {
      return fromHistory;
    }
    return [...fromHistory, ...patches];
  });

  function onDelta(payload: PlatformLlmStreamDeltaPayload): void {
    const chunk = payload.text ?? payload.content ?? payload.reasoning ?? '';
    if (chunk) {
      agentStreamText.value += chunk;
    }
  }

  function bindAgentListeners(): void {
    const sock = socket.getSocket();
    sock.off(ev.matchAgentDelta, onDelta);
    sock.off(ev.matchAgentDone, onAgentDone);
    sock.off(ev.matchError, onAgentError);
    sock.off(ev.matchState, onMatchState);
    sock.on(ev.matchAgentDelta, onDelta);
    sock.on(ev.matchAgentDone, onAgentDone);
    sock.on(ev.matchError, onAgentError);
    sock.on(ev.matchState, onMatchState);
  }

  function onMatchState(payload: { matchId: string; match: MatchView }): void {
    if (payload?.match && match.value?.matchId === payload.matchId) {
      applyAuthoritativeMatch(payload.match);
      void maybeStreamAgentTurn();
    }
  }

  function onAgentDone(payload: { match?: MatchView; agentMoveSummary?: string }): void {
    agentStreamBusy.value = false;
    agentTurnEmitInFlight.value = false;
    agentStreamText.value = '';
    if (payload?.match) {
      applyAuthoritativeMatch(payload.match, { agentMoveSummary: payload.agentMoveSummary });
    }
    void maybeStreamAgentTurn();
  }

  function onAgentError(payload: { error: string }): void {
    agentStreamBusy.value = false;
    agentTurnEmitInFlight.value = false;
    agentStreamText.value = '';
    error.value = payload?.error ?? 'Agent turn failed';
  }

  function ensureSocket(): void {
    const base = resolveUrl().replace(/\/$/, '');
    if (base) {
      socket.connect(base);
    }
  }

  async function dispatchStreamAgentTurnOnce(): Promise<void> {
    while (deferAgentTurnWhile?.()) {
      await new Promise((resolve) => setTimeout(resolve, 280));
      if (disposed) {
        return;
      }
    }
    if (
      !isAiAgentTurnPending(match.value) ||
      agentStreamBusy.value ||
      agentTurnEmitInFlight.value
    ) {
      return;
    }
    agentTurnEmitInFlight.value = true;
    ensureSocket();
    agentStreamBusy.value = true;
    agentStreamText.value = '';
    // Hold the "AI is thinking" state briefly so the move is visible.
    await new Promise((resolve) => setTimeout(resolve, agentTurnDelayMs()));
    if (disposed) {
      agentStreamBusy.value = false;
      agentTurnEmitInFlight.value = false;
      return;
    }
    if (!isAiAgentTurnPending(match.value)) {
      agentStreamBusy.value = false;
      agentTurnEmitInFlight.value = false;
      return;
    }
    try {
      socket.getSocket().emit(ev.matchAgentTurn, { matchId: match.value!.matchId });
    } catch (e) {
      agentStreamBusy.value = false;
      agentTurnEmitInFlight.value = false;
      error.value = e instanceof Error ? e.message : 'Agent turn failed';
    }
  }

  function maybeStreamAgentTurn(): Promise<void> {
    if (streamAgentTurnDispatch) {
      return streamAgentTurnDispatch;
    }
    if (!isAiAgentTurnPending(match.value)) {
      return Promise.resolve();
    }
    streamAgentTurnDispatch = dispatchStreamAgentTurnOnce().finally(() => {
      streamAgentTurnDispatch = null;
    });
    return streamAgentTurnDispatch;
  }

  watch(
    () => match.value,
    (m) => {
      scheduleTurnExpireRefresh();
      banterHooks.onMatchWatch(m);
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
      bindAgentListeners();
      const data = await socket.emitAck<{ match: MatchView }>(ev.matchGet, { matchId });
      applyAuthoritativeMatch(data.match);
      await maybeStreamAgentTurn();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load match';
    } finally {
      loading.value = false;
    }
  }

  async function createAiMatch(
    gameId: string,
    difficulty: GameDifficulty,
    rules?: {
      rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
      wagerQuarks?: number;
      practice?: boolean;
    },
  ): Promise<string> {
    ensureSocket();
    bindAgentListeners();
    const data = await socket.emitAck<{ match: MatchView }>(ev.matchCreateAi, {
      gameId,
      difficulty,
      rulesProfile: rules?.rulesProfile,
      wagerQuarks: rules?.wagerQuarks,
      ...(rules?.practice ? { practice: true } : {}),
    });
    applyAuthoritativeMatch(data.match);
    await maybeStreamAgentTurn();
    return data.match.matchId;
  }

  async function createSoloMatch(
    gameId: string,
    rules?: { rulesProfile?: 'free' | 'eight-ball' | 'nine-ball' },
  ): Promise<string> {
    if (!ev.matchCreateSolo) {
      throw new Error('Solo matches are not enabled for this game');
    }
    ensureSocket();
    bindAgentListeners();
    const data = await socket.emitAck<{ match: MatchView }>(ev.matchCreateSolo, {
      gameId,
      rulesProfile: rules?.rulesProfile,
    });
    applyAuthoritativeMatch(data.match);
    return data.match.matchId;
  }

  async function submitMove(move: Record<string, unknown>): Promise<void> {
    if (!match.value) {
      return;
    }
    ensureSocket();
    bindAgentListeners();
    const data = await socket.emitAck<{ match: MatchView }>(ev.matchMove, {
      matchId: match.value.matchId,
      move,
    });
    applyAuthoritativeMatch(data.match, { pendingMove: move });
    await maybeStreamAgentTurn();
  }

  watch(
    () => match.value,
    (m) => {
      syncLabSidecarHostContextForMatch(m);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    banterHooks.dispose();
    clearLabSidecarGameMatchContext();
    disposed = true;
    clearTurnExpireTimer();
    try {
      const sock = socket.getSocket();
      sock.off(ev.matchAgentDelta, onDelta);
      sock.off(ev.matchAgentDone, onAgentDone);
      sock.off(ev.matchError, onAgentError);
      sock.off(ev.matchState, onMatchState);
    } catch {
      // socket never connected
    }
  });

  const waitingForOpponent = computed(() => {
    const m = match.value;
    if (!m || m.status !== 'active') {
      return false;
    }
    return m.currentSeat !== m.yourSeat && !isAiAgentTurnPending(m);
  });

  return {
    match,
    loading,
    error,
    agentStreamBusy,
    agentStreamText,
    playerTurns,
    load,
    createAiMatch,
    createSoloMatch,
    submitMove,
    refreshMatch,
    maybeStreamAgentTurn,
    ensureSocket,
    waitingForOpponent,
    opponentDisplayName: getOpponentDisplayName,
    flushDeferredBanter,
  };
}
