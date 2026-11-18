import { describe, test, expect } from '@jest/globals';
import { z } from 'zod';
import {
  resolveChatRequestToolChoice,
  resolveChatRequestTools,
} from '@/backend/ai/providers/shared/resolve-chat-request-tools';
import type { MCPToolInterface } from '@/shared/types/mcp-tools';
import type { ChatRequestPayload } from '@/shared/types/llm-provider';

const stubTool = (id: string): MCPToolInterface<z.ZodObject<{ x: z.ZodString }>> => ({
  id,
  name: id,
  description: 'test',
  params: z.object({ x: z.string() }),
  execute: async () => ({
    type: 'tool_result',
    tool_call_id: '1',
    function: id,
    success: true,
    content: 'ok',
  }),
});

describe('resolveChatRequestTools', () => {
  const baseConfig: ChatRequestPayload = {
    sessionId: 's',
    persona: 'PlatformAgent',
    personaConfig: { tools: ['allowed_only'] } as ChatRequestPayload['personaConfig'],
  };

  test('includes persona-allowed tools', () => {
    const tools = [stubTool('allowed_only'), stubTool('other')];
    const out = resolveChatRequestTools(tools, baseConfig);
    expect(out).toHaveLength(1);
    expect(out[0].function.name).toBe('allowed_only');
  });

  test('includes structural tools without persona allowlist', () => {
    const tools = [stubTool('tile_word_grid_submit_move')];
    const config = {
      ...baseConfig,
      structuralToolIds: ['tile_word_grid_submit_move'],
    };
    const out = resolveChatRequestTools(tools, config);
    expect(out).toHaveLength(1);
    expect(out[0].function.name).toBe('tile_word_grid_submit_move');
  });
});

describe('resolveChatRequestToolChoice', () => {
  test('returns string required when structural tool is mandated', () => {
    const mcpTools = resolveChatRequestTools([stubTool('tile_word_grid_submit_move')], {
      sessionId: 's',
      persona: 'PlatformAgent',
      structuralToolIds: ['tile_word_grid_submit_move'],
      requiredStructuralToolId: 'tile_word_grid_submit_move',
    });
    const choice = resolveChatRequestToolChoice(mcpTools, {
      sessionId: 's',
      persona: 'PlatformAgent',
      requiredStructuralToolId: 'tile_word_grid_submit_move',
    });
    expect(choice).toBe('required');
  });

  test('returns auto when tools present but not structurally required', () => {
    const mcpTools = resolveChatRequestTools([stubTool('allowed_only')], {
      sessionId: 's',
      persona: 'PlatformAgent',
      personaConfig: { tools: ['allowed_only'] } as ChatRequestPayload['personaConfig'],
    });
    expect(resolveChatRequestToolChoice(mcpTools, { sessionId: 's', persona: 'PlatformAgent' })).toBe(
      'auto',
    );
  });
});
