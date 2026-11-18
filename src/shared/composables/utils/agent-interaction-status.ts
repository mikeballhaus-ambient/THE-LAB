import type { AgentInteractionStatus } from '@/shared/types';

export function mergeAgentInteractionStatus(
  sessionId: string,
  map: Map<string, AgentInteractionStatus>,
  patch: Partial<AgentInteractionStatus>,
): void {
  const prior = map.get(sessionId) ?? {
    isAwaitingResponse: false,
    isSummarizingMessasge: false,
  };
  map.set(sessionId, { ...prior, ...patch });
}

export function clearPersonaDelegationStatus(
  sessionId: string,
  map: Map<string, AgentInteractionStatus>,
): void {
  mergeAgentInteractionStatus(sessionId, map, {
    isPersonaDelegationActive: false,
    delegationChildSessionId: undefined,
    delegationParentSessionId: undefined,
    delegationChatId: undefined,
    delegationTargetPersona: undefined,
  });
}
