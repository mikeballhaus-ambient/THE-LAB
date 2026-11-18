import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import fastify from 'fastify';
import type { MCPToolResponse } from '@/shared/types';
import { PersonaManagerUtils } from '@/backend/mcp/mcp-servers/persona/utils/persona-manager-utils';
import {
  runActivatePersonaDirect,
  runResponsePersonaDirect,
} from '@/backend/mcp/mcp-servers/persona/utils/persona-workflow-bridge';

function successToolResult(content = '{}'): MCPToolResponse {
  return {
    type: 'tool_result',
    tool_call_id: 'test',
    function: 'test',
    content,
    success: true,
  };
}

describe('Persona workflow HTTP routes (1.26)', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    app = fastify({ logger: false });
    PersonaManagerUtils.initPersonaManagerEndpoints(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test('POST /workflow/activate-persona returns 400 when agent message missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/workflow/activate-persona',
      payload: {
        userId: 2,
        targetPersona: 'Code',
        originatingSessionId: '11111111-1111-1111-1111-111111111111',
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { success: boolean; message: string };
    expect(body.success).toBe(false);
    expect(body.message).toContain('agentMessage');
  });

  test('POST /workflow/activate-persona forwards to handler and returns JSON', async () => {
    const spy = jest
      .spyOn(PersonaManagerUtils, 'activatePersonaHandler')
      .mockResolvedValue(successToolResult('{"newSessionId":"child-1"}'));

    const res = await app.inject({
      method: 'POST',
      url: '/workflow/activate-persona',
      payload: {
        userId: 2,
        targetPersona: 'Code',
        originatingSessionId: '11111111-1111-1111-1111-111111111111',
        agentMessage: 'Implement feature X',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      2,
      '11111111-1111-1111-1111-111111111111',
      'Code',
      'Implement feature X',
      'Implement feature X',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    const body = res.json() as MCPToolResponse;
    expect(body.success).toBe(true);
    spy.mockRestore();
  });

  test('POST /workflow/response-persona forwards to handler', async () => {
    const spy = jest
      .spyOn(PersonaManagerUtils, 'responsePersonaHandler')
      .mockResolvedValue(successToolResult('{"action":"response-persona"}'));

    const res = await app.inject({
      method: 'POST',
      url: '/workflow/response-persona',
      payload: {
        userId: 2,
        sessionId: '22222222-2222-2222-2222-222222222222',
        message: 'Task complete',
        success: true,
        parentSessionId: '11111111-1111-1111-1111-111111111111',
        parentPersona: 'Orchestrator',
        chatId: '33333333-3333-3333-3333-333333333333',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      2,
      '22222222-2222-2222-2222-222222222222',
      'Task complete',
      true,
      '11111111-1111-1111-1111-111111111111',
      'Orchestrator',
      '33333333-3333-3333-3333-333333333333',
      undefined,
    );
    spy.mockRestore();
  });
});

describe('Persona direct workflow bridge (1.26)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('runActivatePersonaDirect maps MCP params to activatePersonaHandler', async () => {
    const spy = jest
      .spyOn(PersonaManagerUtils, 'activatePersonaHandler')
      .mockResolvedValue(successToolResult('ok'));

    const result = await runActivatePersonaDirect({
      userId: 2,
      sessionId: '11111111-1111-1111-1111-111111111111',
      parentPersona: 'Orchestrator',
      targetPersona: 'Code',
      message: 'Do the thing',
    });

    expect(result.success).toBe(true);
    expect(spy).toHaveBeenCalled();
    const firstCall = spy.mock.calls[0];
    expect(firstCall[0]).toBe(2);
    expect(firstCall[2]).toBe('Code');
    expect(firstCall[3]).toBe('Do the thing');
  });

  test('runResponsePersonaDirect maps MCP params to responsePersonaHandler', async () => {
    const spy = jest
      .spyOn(PersonaManagerUtils, 'responsePersonaHandler')
      .mockResolvedValue(successToolResult('done'));

    const result = await runResponsePersonaDirect({
      userId: 2,
      sessionId: '22222222-2222-2222-2222-222222222222',
      parentSessionId: '11111111-1111-1111-1111-111111111111',
      parentPersona: 'Orchestrator',
      chatId: '33333333-3333-3333-3333-333333333333',
      message: 'All good',
      success: true,
    });

    expect(result.success).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      2,
      '22222222-2222-2222-2222-222222222222',
      'All good',
      true,
      '11111111-1111-1111-1111-111111111111',
      'Orchestrator',
      '33333333-3333-3333-3333-333333333333',
    );
  });
});

describe('activatePersonaHandler preconditions (1.26)', () => {
  test('returns error when Socket.IO server unavailable', async () => {
    const { ProviderService } = await import('@/backend/ai/provider-service');
    const provider = ProviderService.getInstance();
    const prevIo = provider.getSocketIOServer();
    jest.spyOn(provider, 'getSocketIOServer').mockReturnValue(null as never);
    jest.spyOn(provider, 'ResolveProviderAdapter').mockResolvedValue({
      chatProvider: {},
    } as never);

    const result = await PersonaManagerUtils.activatePersonaHandler(
      2,
      '11111111-1111-1111-1111-111111111111',
      'Code',
      'hello',
      'hello',
    );

    expect(result.success).toBe(false);
    expect(result.content).toContain('Socket server');

    jest.spyOn(provider, 'getSocketIOServer').mockReturnValue(prevIo as never);
    jest.restoreAllMocks();
  });
});
