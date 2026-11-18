import { describe, expect, test, beforeEach } from '@jest/globals';
import { applyAgentTurnRecoveryMessages, applyStreamTurnRecoveryMessages } from '@/backend/utils/chat/model-turn-recovery';
import {
  getModelTurnRecoveryMetrics,
  resetModelTurnRecoveryMetrics,
} from '@/shared/config/lab-model-turn-recovery-metrics';
import type { ChatMessage } from '@/shared/types';

describe('model-turn-recovery metrics (2.21)', () => {
  beforeEach(() => resetModelTurnRecoveryMetrics());

  test('stream recovery increments counters on retry_push_user_message', () => {
    const fullMessages: ChatMessage[] = [];
    applyStreamTurnRecoveryMessages(
      {
        toolCallsLength: 0,
        contentLength: 0,
        reasoningLength: 0,
        reasoningText: '',
        latestChunkIsError: false,
        invalidToolCallExtracted: false,
        invalidToolCallError: '',
        invalidToolCallOriginalJson: '',
      },
      fullMessages,
      undefined,
    );
    const metrics = getModelTurnRecoveryMetrics();
    expect(metrics.streamRecoveryInvocations).toBe(1);
    expect(metrics.streamRetryUserMessage).toBe(1);
  });

  test('agent recovery does not retry on terminal provider error chunk', () => {
    const fullMessages: ChatMessage[] = [];
    const errorMessage: ChatMessage = { role: 'assistant', content: 'fail', isError: true };
    const action = applyAgentTurnRecoveryMessages(
      {
        toolCallsLength: 0,
        messageLength: 10,
        reasoningLength: 0,
        reasoningText: '',
        messageIsError: true,
        invalidToolCallExtracted: false,
        invalidToolCallError: '',
        invalidToolCallOriginalJson: '',
      },
      fullMessages,
      errorMessage,
    );
    const metrics = getModelTurnRecoveryMetrics();
    expect(action).toBe('none');
    expect(metrics.agentRecoveryInvocations).toBe(0);
    expect(metrics.agentRetryErrorChunk).toBe(0);
    expect(fullMessages).toHaveLength(0);
  });
});
