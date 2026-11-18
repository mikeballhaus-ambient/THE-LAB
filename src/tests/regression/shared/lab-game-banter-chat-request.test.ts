import { LAB_GAME_BANTER_CHAT_REQUEST_EXTRAS } from '@/shared/game-platform/lab-assistant-banter/lab-game-banter-chat-request';
import { buildOpenAiCompatRequestExtras } from '@/backend/ai/providers/shared/chat-request-payload';

describe('lab-game-banter-chat-request', () => {
  test('banter extras disable OpenAI-compat thinking', () => {
    const extras = buildOpenAiCompatRequestExtras({
      sessionId: 's1',
      persona: 'Chat',
      ...LAB_GAME_BANTER_CHAT_REQUEST_EXTRAS,
    });
    expect(extras.reasoning_effort).toBe('none');
    expect(extras.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(LAB_GAME_BANTER_CHAT_REQUEST_EXTRAS.maxTokens).toBeGreaterThan(0);
  });
});
