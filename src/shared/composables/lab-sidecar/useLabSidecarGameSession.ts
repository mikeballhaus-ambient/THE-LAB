import type { GameDifficulty, MatchView } from '@/shared/game-platform/types';
import {
  LAB_SIDECAR_GAME_VIEW_PLAY,
  LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY,
  LAB_SIDECAR_HOST_CTX_GAME_ID,
  LAB_SIDECAR_HOST_CTX_GAME_VIEW,
  LAB_SIDECAR_HOST_CTX_MATCH_ID,
} from '@/shared/constants/lab-game-assistant-opponent';
import { rawLabGameSidecarSessionTitle } from '@/shared/composables/lab-sidecar/lab-game-sidecar-session-resolve';
import { getLabShellSidecarBridge } from '@/shared/composables/lab-shell-sidecar-bridge';
import { labSidecarExpanded } from '@/shared/composables/lab-sidecar/lab-sidecar-shell-state';
import { getDashboardLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';
import {
  clearLabSidecarGameMatchSnapshot,
  setLabSidecarGameMatchSnapshot,
} from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';

function setLabSidecarHostContext(patch: Record<string, string>): void {
  getDashboardLabWorkspaceContext()?.setHostContext(patch);
}

/** Publish active vs–Lab Assistant match facts for Sidecar system appendix / future banter. */
export function publishLabSidecarGameMatchContext(options: {
  gameId: string;
  matchId: string;
  difficulty: GameDifficulty;
}): void {
  setLabSidecarHostContext({
    [LAB_SIDECAR_HOST_CTX_GAME_VIEW]: LAB_SIDECAR_GAME_VIEW_PLAY,
    [LAB_SIDECAR_HOST_CTX_GAME_ID]: options.gameId,
    [LAB_SIDECAR_HOST_CTX_MATCH_ID]: options.matchId,
    [LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY]: options.difficulty,
  });
}

export function clearLabSidecarGameMatchContext(matchId?: string): void {
  setLabSidecarHostContext({
    [LAB_SIDECAR_HOST_CTX_GAME_VIEW]: '',
    [LAB_SIDECAR_HOST_CTX_GAME_ID]: '',
    [LAB_SIDECAR_HOST_CTX_MATCH_ID]: '',
    [LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY]: '',
  });
  if (matchId?.trim()) {
    clearLabSidecarGameSessionForMatch(matchId);
  }
}

/**
 * Keep shell host context aligned with the active vs–AI match **before** banter runs on the same tick.
 */
export function syncLabSidecarHostContextForMatch(m: MatchView | null): void {
  if (m?.opponentKind === 'ai' && m.status === 'active' && m.difficulty) {
    publishLabSidecarGameMatchContext({
      gameId: m.gameId,
      matchId: m.matchId,
      difficulty: m.difficulty,
    });
    setLabSidecarGameMatchSnapshot(m);
    void tryEngageLabSidecarGameSessionFromMatch(m);
    return;
  }
  if (!m || m.opponentKind !== 'ai' || m.status === 'finished') {
    clearLabSidecarGameMatchContext(m?.matchId);
    clearLabSidecarGameMatchSnapshot();
  }
}

/** Sidecar already open (e.g. auto-open on app launch) — start the Chat session once match context exists. */
export async function tryEngageLabSidecarGameSessionFromMatch(m: MatchView): Promise<void> {
  if (!labSidecarExpanded.value) {
    return;
  }
  if (m.opponentKind !== 'ai' || m.status !== 'active') {
    return;
  }
  await ensureLabSidecarGameSessionWhenEngaging({
    sessionTitle: rawLabGameSidecarSessionTitle(m.gameId),
    gameId: m.gameId,
    matchId: m.matchId,
    difficulty: m.difficulty ?? undefined,
  });
}

export function readLabSidecarGameEngagementFromHost(
  hostContext: Record<string, string>,
): { gameId: string; matchId: string; difficulty?: GameDifficulty } | null {
  if (hostContext[LAB_SIDECAR_HOST_CTX_GAME_VIEW] !== LAB_SIDECAR_GAME_VIEW_PLAY) {
    return null;
  }
  const matchId = hostContext[LAB_SIDECAR_HOST_CTX_MATCH_ID]?.trim();
  const gameId = hostContext[LAB_SIDECAR_HOST_CTX_GAME_ID]?.trim();
  if (!matchId || !gameId) {
    return null;
  }
  const difficulty = hostContext[LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY]?.trim();
  return {
    gameId,
    matchId,
    difficulty: difficulty as GameDifficulty | undefined,
  };
}

const startedSidecarSessionsForMatch = new Set<string>();
const sidecarSessionIdByMatchId = new Map<string, string>();

/** Dexie chat session that owns banter for a vs–AI match (stable across Sidecar tab switches). */
export function registerLabSidecarGameSessionForMatch(matchId: string, sessionId: string): void {
  const trimmed = matchId.trim();
  const sid = sessionId.trim();
  if (!trimmed || !sid) {
    return;
  }
  sidecarSessionIdByMatchId.set(trimmed, sid);
}

export function resolveLabSidecarGameSessionId(matchId: string): string | undefined {
  return sidecarSessionIdByMatchId.get(matchId.trim());
}

export function clearLabSidecarGameSessionForMatch(matchId: string): void {
  const trimmed = matchId.trim();
  if (!trimmed) {
    return;
  }
  sidecarSessionIdByMatchId.delete(trimmed);
  startedSidecarSessionsForMatch.delete(trimmed);
}

/**
 * When the Sidecar opens during play, start a dedicated Chat session once per match (Q3).
 * No-op if bridge unavailable or session already started for this matchId.
 */
export async function ensureLabSidecarGameSessionWhenEngaging(options: {
  sessionTitle: string;
  gameId: string;
  matchId: string;
  difficulty?: GameDifficulty;
}): Promise<void> {
  if (
    resolveLabSidecarGameSessionId(options.matchId) ||
    startedSidecarSessionsForMatch.has(options.matchId)
  ) {
    return;
  }
  const bridge = getLabShellSidecarBridge();
  if (!bridge?.startGameSidecarSession) {
    return;
  }
  startedSidecarSessionsForMatch.add(options.matchId);
  try {
    await bridge.startGameSidecarSession({
      sessionTitle: options.sessionTitle,
      gameId: options.gameId,
      matchId: options.matchId,
      difficulty: options.difficulty,
    });
  } finally {
    if (!resolveLabSidecarGameSessionId(options.matchId)) {
      startedSidecarSessionsForMatch.delete(options.matchId);
    }
  }
}
