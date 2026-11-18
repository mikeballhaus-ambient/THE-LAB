export const GAME_PENDING_MATCH_STORAGE_KEY = 'lab-game-pending-match';

export interface GamePendingMatch {
  appId: string;
  matchId: string;
  gameId: string;
}

export const GAME_PENDING_MATCH_EVENT = 'lab-game-pending-match';

export function saveGamePendingMatch(payload: GamePendingMatch): void {
  sessionStorage.setItem(GAME_PENDING_MATCH_STORAGE_KEY, JSON.stringify(payload));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GAME_PENDING_MATCH_EVENT, { detail: payload }));
  }
}

export function readGamePendingMatch(): GamePendingMatch | null {
  const raw = sessionStorage.getItem(GAME_PENDING_MATCH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as GamePendingMatch;
    if (parsed.matchId && parsed.gameId && parsed.appId) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function clearGamePendingMatch(): void {
  sessionStorage.removeItem(GAME_PENDING_MATCH_STORAGE_KEY);
}
