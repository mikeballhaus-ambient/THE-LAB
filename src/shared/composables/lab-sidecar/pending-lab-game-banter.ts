import type { LabAssistantBanterRequest } from '@/shared/game-platform/lab-assistant-banter/types';

/** Latest moment waiting while a prior banter completion is in flight (one slot per session). */
const pendingBySessionId = new Map<string, LabAssistantBanterRequest>();

export function enqueuePendingLabGameBanter(
  sessionId: string,
  request: LabAssistantBanterRequest,
): void {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return;
  }
  pendingBySessionId.set(trimmed, request);
}

export function dequeuePendingLabGameBanter(sessionId: string): LabAssistantBanterRequest | undefined {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return undefined;
  }
  const pending = pendingBySessionId.get(trimmed);
  pendingBySessionId.delete(trimmed);
  return pending;
}

export function clearPendingLabGameBanter(sessionId: string): void {
  pendingBySessionId.delete(sessionId.trim());
}
