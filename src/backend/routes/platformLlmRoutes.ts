import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import {
  PlatformLlmCompletionBodySchema,
  PlatformLlmCompletionService,
} from '../services/platform-llm-completion-service';
import { platformLlmStreamDeltaToPayload } from '@/shared/types/platform-llm-completion';
import { platformLlmStreamDebug } from '@/shared/utils/agent-stream-debug.node';
import type { ServerResponse } from 'node:http';

function flushSse(res: ServerResponse): void {
  const maybeFlush = (res as ServerResponse & { flush?: () => void }).flush;
  if (typeof maybeFlush === 'function') {
    maybeFlush();
  }
}

export function registerPlatformLlmRoutes(server: FastifyInstance): void {
  server.post('/api/platform/llm/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requirePlatformHttpUser(request, reply);
    if (!user) {
      return;
    }
    const parsed = PlatformLlmCompletionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.message });
    }
    if (parsed.data.purpose.includes('agent-turn')) {
      platformLlmStreamDebug('complete (non-stream) request', {
        purpose: parsed.data.purpose,
        userId: user.userId,
        maxTokens: parsed.data.maxTokens,
        toolFeedbackTurns: parsed.data.toolFeedbackTurns?.length ?? 0,
        hasRetryUserHint: Boolean(parsed.data.retryUserHint),
      });
    }
    const result = await PlatformLlmCompletionService.getInstance().completeForUser(
      user.userId,
      parsed.data,
    );
    if (parsed.data.purpose.includes('agent-turn')) {
      platformLlmStreamDebug('complete (non-stream) finished', {
        purpose: parsed.data.purpose,
        success: result.success,
        contentLen: result.success ? result.data.content.length : 0,
      });
    }
    if (!result.success) {
      const status = result.code === 'NO_PROVIDER' ? 503 : 502;
      return reply.status(status).send(result);
    }
    return reply.send(result);
  });

  server.post(
    '/api/platform/llm/complete-stream',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requirePlatformHttpUser(request, reply);
      if (!user) {
        return;
      }
      const parsed = PlatformLlmCompletionBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.message });
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      let sseDeltaCount = 0;
      let sseDeltaChars = 0;
      const send = (event: string, data: unknown) => {
        if (event === 'delta') {
          const payload = data as { text?: string; reasoning?: string; content?: string };
          const text =
            payload.text ??
            `${payload.reasoning ?? ''}${payload.content ?? ''}`;
          sseDeltaCount += 1;
          sseDeltaChars += text.length;
          if (sseDeltaCount <= 3 || sseDeltaCount % 25 === 0) {
            platformLlmStreamDebug('sse write delta', {
              sseDeltaCount,
              sseDeltaChars,
              sampleLen: text.length,
            });
          }
        } else {
          platformLlmStreamDebug('sse write', { event });
        }
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        flushSse(reply.raw);
      };

      platformLlmStreamDebug('complete-stream request', {
        purpose: parsed.data.purpose,
        userId: user.userId,
        maxTokens: parsed.data.maxTokens,
      });
      const result = await PlatformLlmCompletionService.getInstance().streamForUser(
        user.userId,
        parsed.data,
        (delta) => send('delta', platformLlmStreamDeltaToPayload(delta)),
      );
      platformLlmStreamDebug('complete-stream finished', {
        success: result.success,
        sseDeltaCount,
        sseDeltaChars,
      });

      if (!result.success) {
        const status = result.code === 'NO_PROVIDER' ? 503 : 502;
        send('error', { error: result.error, code: result.code, status });
        reply.raw.end();
        return;
      }
      send('done', result.data);
      reply.raw.end();
    },
  );
}
