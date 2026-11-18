import { describe, test, expect } from '@jest/globals';
import {
  applyAgentTurnRecoveryMessages,
  buildEmptyTurnRetryUserMessage,
  buildMalformedToolRetryUserMessage,
} from '@/backend/utils/chat/model-turn-recovery';
import type { ChatMessage } from '@/shared/types';

describe('model-turn-recovery', () => {
  test('applyAgentTurnRecoveryMessages pushes empty-turn nudge', () => {
    const fullMessages: ChatMessage[] = [];
    const action = applyAgentTurnRecoveryMessages(
      {
        toolCallsLength: 0,
        messageLength: 0,
        reasoningLength: 0,
        reasoningText: '',
      },
      fullMessages,
      undefined,
    );
    expect(action).toBe('retry_push_user_message');
    expect(fullMessages[0]?.content).toBe(buildEmptyTurnRetryUserMessage());
  });

  test('malformed tool retry message includes validation detail', () => {
    const msg = buildMalformedToolRetryUserMessage('Unexpected token', '{"broken":');
    expect(msg).toContain('Unexpected token');
    expect(msg).toContain('ui_automation_discover_elements');
  });
});
