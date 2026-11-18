/** Counters for ModelTurnRecovery (rm-46 **2.21**). */
const counters = {
  streamRecoveryInvocations: 0,
  agentRecoveryInvocations: 0,
  streamRetryUserMessage: 0,
  streamRetryErrorChunk: 0,
  agentRetryUserMessage: 0,
  agentRetryErrorChunk: 0,
};

export type ModelTurnRecoveryMetrics = typeof counters;

export function getModelTurnRecoveryMetrics(): Readonly<ModelTurnRecoveryMetrics> {
  return { ...counters };
}

export function resetModelTurnRecoveryMetrics(): void {
  counters.streamRecoveryInvocations = 0;
  counters.agentRecoveryInvocations = 0;
  counters.streamRetryUserMessage = 0;
  counters.streamRetryErrorChunk = 0;
  counters.agentRetryUserMessage = 0;
  counters.agentRetryErrorChunk = 0;
}

export function recordStreamTurnRecovery(action: 'retry_push_user_message' | 'retry_push_error_chunk' | 'none'): void {
  if (action === 'none') return;
  counters.streamRecoveryInvocations += 1;
  if (action === 'retry_push_user_message') counters.streamRetryUserMessage += 1;
  if (action === 'retry_push_error_chunk') counters.streamRetryErrorChunk += 1;
}

export function recordAgentTurnRecovery(action: 'retry_push_user_message' | 'retry_push_error_chunk' | 'none'): void {
  if (action === 'none') return;
  counters.agentRecoveryInvocations += 1;
  if (action === 'retry_push_user_message') counters.agentRetryUserMessage += 1;
  if (action === 'retry_push_error_chunk') counters.agentRetryErrorChunk += 1;
}
