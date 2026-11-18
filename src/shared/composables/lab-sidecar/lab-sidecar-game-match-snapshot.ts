import type { GameDifficulty, MatchStatus, MatchView, OpponentKind } from '@/shared/game-platform/types';
import {
  readMatchTurnHistory,
  type MatchTurnHistoryEntry,
} from '@/shared/game-platform/use-turn-based-match';

/** Latest vs–Lab Assistant match view for Sidecar user chat + banter (client module state). */
export interface LabSidecarGameMatchSnapshot {
  gameId: string;
  matchId: string;
  status: MatchStatus;
  opponentKind: OpponentKind;
  difficulty: GameDifficulty | null;
  yourSeat: number;
  currentSeat: number;
  scores: Record<number, number>;
  turnRemainingMs: number;
  lastTurn?: { seat: number; summary: string };
  turnHistoryLength: number;
  turnHistory: MatchTurnHistoryEntry[];
  /** Full human-visible match state (same as {@link MatchView.state} on the client). */
  state: unknown;
  /** Signed-in Lab user display name (profile `name`) for table talk. */
  humanDisplayName?: string;
}

let latestSnapshot: LabSidecarGameMatchSnapshot | null = null;

export function setLabSidecarGameMatchSnapshot(match: MatchView): void {
  latestSnapshot = matchViewToLabSidecarSnapshot(match);
}

export function clearLabSidecarGameMatchSnapshot(): void {
  latestSnapshot = null;
}

export function getLabSidecarGameMatchSnapshot(): LabSidecarGameMatchSnapshot | null {
  return latestSnapshot;
}

export function enrichLabSidecarGameMatchSnapshotWithUser(
  snapshot: LabSidecarGameMatchSnapshot | null | undefined,
  displayName?: string | null,
): LabSidecarGameMatchSnapshot | undefined {
  if (!snapshot) {
    return undefined;
  }
  const trimmed = displayName?.trim();
  if (!trimmed || snapshot.humanDisplayName === trimmed) {
    return snapshot;
  }
  return { ...snapshot, humanDisplayName: trimmed };
}

function cloneMatchStateForSnapshot(state: unknown): unknown {
  if (state === null || state === undefined) {
    return state;
  }
  try {
    return JSON.parse(JSON.stringify(state)) as unknown;
  } catch {
    return { error: 'match state not serializable for Sidecar snapshot' };
  }
}

export function matchViewToLabSidecarSnapshot(match: MatchView): LabSidecarGameMatchSnapshot {
  const history = readMatchTurnHistory(match.state);
  const last = history.length > 0 ? history[history.length - 1] : undefined;
  return {
    gameId: match.gameId,
    matchId: match.matchId,
    status: match.status,
    opponentKind: match.opponentKind,
    difficulty: match.difficulty,
    yourSeat: match.yourSeat,
    currentSeat: match.currentSeat,
    scores: { ...match.scores },
    turnRemainingMs: match.turnRemainingMs,
    turnHistoryLength: history.length,
    turnHistory: history.map((entry) => ({ seat: entry.seat, summary: entry.summary })),
    lastTurn: last ? { seat: last.seat, summary: last.summary } : undefined,
    state: cloneMatchStateForSnapshot(match.state),
  };
}
