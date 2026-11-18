import {
  LAB_ASSISTANT_GAME_OPPONENT_LABEL,
  LAB_SIDECAR_GAME_VIEW_PLAY,
  LAB_SIDECAR_HOST_CTX_GAME_VIEW,
} from '@/shared/constants/lab-game-assistant-opponent';
import { resolveLabGameHumanDisplayName } from '@/shared/constants/lab-game-human-display-name';
import {
  resolveAssistantSeat,
  resolveHumanSeat,
} from '@/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt';
import type { LabSidecarChatContext } from '@/shared/types/lab-sidecar-view-context';
import { readLabSidecarGameEngagementFromHost } from '@/shared/composables/lab-sidecar/useLabSidecarGameSession';
import type { LabSidecarGameMatchSnapshot } from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';
import { formatLabGameMatchStateSections } from '@/shared/game-platform/lab-assistant-banter/format-lab-game-match-state-for-prompt';

function actorLabel(
  snapshot: LabSidecarGameMatchSnapshot,
  seat: number,
  humanSeat: 1 | 2,
  assistantSeat: 1 | 2,
): string {
  if (seat === humanSeat) {
    return resolveLabGameHumanDisplayName(snapshot.humanDisplayName);
  }
  if (seat === assistantSeat) {
    return LAB_ASSISTANT_GAME_OPPONENT_LABEL;
  }
  return `player ${seat}`;
}

const LAB_GAME_USER_CHAT_REPLY_RULES = `### How to reply (user Sidecar message — not proactive banter)
You are **${LAB_ASSISTANT_GAME_OPPONENT_LABEL}** at the table. Answer **only what the user asked** above, using the snapshot for board facts — conversational and in character. Prefer **you** or no direct address; do **not** put their Lab profile display name in every reply (awkward at the table). The display name below is metadata only — never open with it unless the moment is unusually personal (e.g. gracious match end).

**Forbidden in your reply:** saying "seat 1", "seat 2", "your turn now", "what's next?", or other turn-clock / UI announcer lines; do not read aloud the metadata bullets below. Those labels are internal reasoning only.`;

export function labSidecarGameSnapshotMatchesContext(
  snapshot: LabSidecarGameMatchSnapshot,
  labSidecarContext: LabSidecarChatContext | undefined,
): boolean {
  const host = labSidecarContext?.hostContext;
  if (!host || host[LAB_SIDECAR_HOST_CTX_GAME_VIEW] !== LAB_SIDECAR_GAME_VIEW_PLAY) {
    return false;
  }
  const engagement = readLabSidecarGameEngagementFromHost(host);
  if (!engagement) {
    return false;
  }
  return engagement.gameId === snapshot.gameId && engagement.matchId === snapshot.matchId;
}

/**
 * Ephemeral appendix merged into the latest user turn for the LLM only (Dexie keeps plain user text).
 */
export function buildLabGameUserChatContextBlock(snapshot: LabSidecarGameMatchSnapshot): string {
  const humanSeat = resolveHumanSeat(snapshot.yourSeat);
  const assistantSeat = resolveAssistantSeat(humanSeat);
  const humanLabel = resolveLabGameHumanDisplayName(snapshot.humanDisplayName);
  const onClock = actorLabel(snapshot, snapshot.currentSeat, humanSeat, assistantSeat);
  const scoreParts = Object.entries(snapshot.scores)
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .map(([seat, v]) => `${actorLabel(snapshot, Number(seat), humanSeat, assistantSeat)}: ${v}`);
  const scoresLine = scoreParts.length > 0 ? scoreParts.join('; ') : 'none recorded yet';

  const lastMoveLine = snapshot.lastTurn
    ? `${actorLabel(snapshot, snapshot.lastTurn.seat, humanSeat, assistantSeat)} — ${snapshot.lastTurn.summary}`
    : 'none yet';

  const stateObj =
    snapshot.state && typeof snapshot.state === 'object'
      ? (snapshot.state as { phase?: string; winnerSeat?: number | null })
      : null;
  const frameFinished =
    snapshot.status === 'finished' ||
    stateObj?.phase === 'finished';
  const winnerSeat = stateObj?.winnerSeat ?? null;
  let matchOverLine = '';
  if (frameFinished) {
    if (winnerSeat === humanSeat) {
      matchOverLine = `- **MATCH OVER:** ${humanLabel} won this frame — you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) **lost**. Answer as someone who knows the rack ended; do not argue that the 8 "did not count" or that play continues.\n`;
    } else if (winnerSeat === assistantSeat) {
      matchOverLine = `- **MATCH OVER:** you (${LAB_ASSISTANT_GAME_OPPONENT_LABEL}) won — ${humanLabel} lost.\n`;
    } else {
      matchOverLine = '- **MATCH OVER:** status/finished — treat the frame as complete.\n';
    }
  }

  const summary = `[Live match context — internal metadata for reasoning; do not quote in your reply]
- Game: ${snapshot.gameId}, match ${snapshot.matchId}, status ${snapshot.status}${
    snapshot.difficulty ? `, difficulty ${snapshot.difficulty}` : ''
  }
${matchOverLine}
- ${humanLabel} (Lab user display name) at the keyboard vs ${LAB_ASSISTANT_GAME_OPPONENT_LABEL} on the board.
- On the clock: ${onClock}${snapshot.status === 'active' && snapshot.turnRemainingMs > 0 ? ` (~${Math.ceil(snapshot.turnRemainingMs / 1000)}s remaining on turn timer)` : ''}.
- Scores: ${scoresLine}.
- Last move: ${lastMoveLine} (${snapshot.turnHistoryLength} plies in history).

${LAB_GAME_USER_CHAT_REPLY_RULES}`;

  return `${summary}\n\n${formatLabGameMatchStateSections(snapshot)}`;
}

export { appendLabGameMatchSnapshotToPrompt } from '@/shared/game-platform/lab-assistant-banter/format-lab-game-match-state-for-prompt';

export function enrichChatMessagesWithLabGameSnapshot<T extends { role: string; content: unknown }>(
  messages: T[],
  userMessageText: string,
  snapshot: LabSidecarGameMatchSnapshot,
): T[] {
  const appendix = buildLabGameUserChatContextBlock(snapshot);
  const combined = `${userMessageText.trim()}\n\n${appendix}`;
  const out = messages.map((m) => ({ ...m }));
  for (let i = out.length - 1; i >= 0; i -= 1) {
    if (out[i].role === 'user') {
      out[i] = { ...out[i], content: combined };
      break;
    }
  }
  return out;
}
