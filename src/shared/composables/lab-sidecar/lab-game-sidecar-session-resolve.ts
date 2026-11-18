import type { ChatSessionRecord } from '@/shared/types';
import { LAB_ASSISTANT_GAME_OPPONENT_LABEL } from '@/shared/constants/lab-game-assistant-opponent';
import { LAB_GAME_SIDECAR_PERSONA } from '@/shared/composables/lab-shell-sidecar-bridge';

/** Full title before SessionManager word cap (see `truncateSessionTabTitle`). */
export function rawLabGameSidecarSessionTitle(gameId: string): string {
  return `${gameId} vs ${LAB_ASSISTANT_GAME_OPPONENT_LABEL}`;
}

/** Matches Dexie tab titles created via SessionManager.createNewSession. */
export function truncateSessionTabTitle(text: string, maxWords = 4): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return text.trim();
  }
  let truncated = words.slice(0, maxWords).join(' ');
  if (truncated.length > 25) {
    truncated = `${truncated.substring(0, 22)}...`;
  }
  return truncated || 'New Chat';
}

export function formatLabGameSidecarSessionTitle(gameId: string): string {
  return truncateSessionTabTitle(rawLabGameSidecarSessionTitle(gameId));
}

/**
 * Reuse an existing Sidecar tab for the same catalog game (one tab per gameId, new match updates routing).
 */
export function findReusableLabGameSidecarSession(
  sessions: ChatSessionRecord[],
  gameId: string,
): ChatSessionRecord | undefined {
  const trimmedGameId = gameId.trim();
  if (!trimmedGameId) {
    return undefined;
  }
  const expectedTitle = formatLabGameSidecarSessionTitle(trimmedGameId);
  const candidates = sessions.filter((s) => {
    if (s.persona !== LAB_GAME_SIDECAR_PERSONA) {
      return false;
    }
    if (s.labGameSidecarGameId?.trim() === trimmedGameId) {
      return true;
    }
    return s.title === expectedTitle;
  });
  if (candidates.length === 0) {
    return undefined;
  }
  return candidates.reduce((best, s) => (s.lastActivity > best.lastActivity ? s : best));
}

/** Game Sidecar tabs keep `{gameId} vs Lab Assistant` — do not replace with first-message auto-title. */
export function shouldApplyAutoSessionTitleFromFirstMessage(
  session: Pick<ChatSessionRecord, 'labGameSidecarGameId'> | undefined | null,
): boolean {
  return !session?.labGameSidecarGameId?.trim();
}
