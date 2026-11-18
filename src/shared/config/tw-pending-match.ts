import {
  clearGamePendingMatch,
  GAME_PENDING_MATCH_EVENT,
  readGamePendingMatch,
  saveGamePendingMatch,
  type GamePendingMatch,
} from './game-pending-match';
import { DEFAULT_LEGACY_GAME_APP_ID } from './game-app-invite-registry';

/** @deprecated Use game-pending-match */
export const TW_PENDING_MATCH_STORAGE_KEY = 'tw-pending-match';

export interface TwPendingMatch {
  matchId: string;
  gameId: string;
  appId?: string;
}

/** @deprecated Use GAME_PENDING_MATCH_EVENT */
export const TW_PENDING_MATCH_EVENT = GAME_PENDING_MATCH_EVENT;

export function saveTwPendingMatch(payload: TwPendingMatch): void {
  saveGamePendingMatch({
    appId: payload.appId ?? DEFAULT_LEGACY_GAME_APP_ID,
    matchId: payload.matchId,
    gameId: payload.gameId,
  });
}

export function readTwPendingMatch(): TwPendingMatch | null {
  const g = readGamePendingMatch();
  if (!g) {
    const legacyRaw = sessionStorage.getItem(TW_PENDING_MATCH_STORAGE_KEY);
    if (!legacyRaw) {
      return null;
    }
    try {
      const parsed = JSON.parse(legacyRaw) as TwPendingMatch;
      if (parsed.matchId && parsed.gameId) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }
  return { matchId: g.matchId, gameId: g.gameId, appId: g.appId };
}

export function clearTwPendingMatch(): void {
  clearGamePendingMatch();
  sessionStorage.removeItem(TW_PENDING_MATCH_STORAGE_KEY);
}

export type { GamePendingMatch };
