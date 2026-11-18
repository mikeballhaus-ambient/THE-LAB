import type { MatchView } from '@/shared/game-platform/types';
import type { DetectBanterMomentFn, LabAssistantBanterMoment } from './types';

export function composeBanterDetectors(
  ...detectors: readonly DetectBanterMomentFn[]
): DetectBanterMomentFn {
  return (prev, next) => {
    for (const detect of detectors) {
      const moment = detect(prev, next);
      if (moment) {
        return moment;
      }
    }
    return null;
  };
}

export function requireAiOpponent(
  detect: DetectBanterMomentFn,
): DetectBanterMomentFn {
  return (prev, next) => {
    if (next.opponentKind !== 'ai') {
      return null;
    }
    return detect(prev, next);
  };
}

export function lastTurnHistoryEntry(
  prev: MatchView | null,
  next: MatchView,
): { seat: number; summary: string } | null {
  if (!prev) {
    return null;
  }
  const prevRaw = (prev.state as { turnHistory?: unknown })?.turnHistory;
  const nextRaw = (next.state as { turnHistory?: unknown })?.turnHistory;
  if (!Array.isArray(prevRaw) || !Array.isArray(nextRaw) || nextRaw.length <= prevRaw.length) {
    return null;
  }
  const last = nextRaw[nextRaw.length - 1];
  if (!last || typeof last !== 'object') {
    return null;
  }
  const seat = (last as { seat?: unknown }).seat;
  const summary = (last as { summary?: unknown }).summary;
  if (typeof seat !== 'number' || typeof summary !== 'string') {
    return null;
  }
  return { seat, summary };
}

export function inferMoverSeat(prev: MatchView, next: MatchView): number {
  const fromHistory = lastTurnHistoryEntry(prev, next);
  if (fromHistory) {
    return fromHistory.seat;
  }
  return prev.currentSeat;
}

export function scoreDeltaForSeat(
  prev: MatchView,
  next: MatchView,
  seat: number,
): number {
  return (next.scores[seat] ?? 0) - (prev.scores[seat] ?? 0);
}

export type KeywordMomentRule = {
  test: (summaryLower: string) => boolean;
  kind: LabAssistantBanterMoment['kind'];
};

export function detectFromHistoryKeywords(
  prev: MatchView | null,
  next: MatchView,
  rules: readonly KeywordMomentRule[],
): LabAssistantBanterMoment | null {
  const entry = lastTurnHistoryEntry(prev, next);
  if (!entry) {
    return null;
  }
  const lower = entry.summary.toLowerCase();
  for (const rule of rules) {
    if (rule.test(lower)) {
      return { kind: rule.kind, moverSeat: entry.seat };
    }
  }
  return null;
}
