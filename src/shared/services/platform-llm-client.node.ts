import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import type {
  PlatformLlmCompletionRequest,
  PlatformLlmCompletionResponse,
  PlatformLlmCompletionResult,
  PlatformLlmStreamDelta,
} from '@/shared/types/platform-llm-completion';
import {
  PLATFORM_AGENT_TURN_HTTP_TIMEOUT_MS,
  platformLlmStreamDeltaFromPayload,
} from '@/shared/types/platform-llm-completion';
import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import { readFetchSse } from '@/shared/utils/sse-parse';
import { twAgentStreamDebug } from '@/shared/utils/agent-stream-debug.node';

/**
 * App server → platform (:3000): run a chat completion using the acting user's provider config.
 * Reusable by any THE-LAB hybrid app (games, tools) — not tied to Lab Assistant UI.
 */
export async function requestPlatformLlmCompletion(
  actorUserId: number,
  request: PlatformLlmCompletionRequest,
  options?: { hostAppId?: string },
): Promise<PlatformLlmCompletionResult> {
  const base = resolvePlatformBackendUrl();
  const headers: Record<string, string> = {
    ...buildPlatformServiceAuthHeaders(actorUserId),
    'Content-Type': 'application/json',
  };
  if (options?.hostAppId) {
    headers['X-Host-App-Id'] = options.hostAppId;
  }
  const isAgentTurn = request.purpose.includes('agent-turn');
  if (isAgentTurn) {
    twAgentStreamDebug('platform complete (non-stream) fetch start', {
      purpose: request.purpose,
      actorUserId,
      maxTokens: request.maxTokens,
      toolFeedbackTurns: request.toolFeedbackTurns?.length ?? 0,
    });
  }
  const response = await fetch(`${base}/api/platform/llm/complete`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    ...(isAgentTurn ? { signal: AbortSignal.timeout(PLATFORM_AGENT_TURN_HTTP_TIMEOUT_MS) } : {}),
  });
  const body = (await response.json()) as PlatformLlmCompletionResponse;
  if (request.purpose.includes('agent-turn')) {
    twAgentStreamDebug('platform complete (non-stream) fetch end', {
      purpose: request.purpose,
      ok: response.ok && body.success,
      contentLen: body.success ? body.data.content.length : 0,
    });
  }
  if (!response.ok || !body.success) {
    const message =
      !body.success && 'error' in body
        ? body.error
        : `Platform LLM completion failed (${response.status})`;
    throw new Error(message);
  }
  return body.data;
}

export async function requestPlatformLlmCompletionStream(
  actorUserId: number,
  request: PlatformLlmCompletionRequest,
  onDelta: (delta: PlatformLlmStreamDelta) => void,
  options?: { hostAppId?: string },
): Promise<PlatformLlmCompletionResult> {
  const base = resolvePlatformBackendUrl();
  const headers: Record<string, string> = {
    ...buildPlatformServiceAuthHeaders(actorUserId),
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (options?.hostAppId) {
    headers['X-Host-App-Id'] = options.hostAppId;
  }
  twAgentStreamDebug('platform complete-stream fetch start', {
    purpose: request.purpose,
    actorUserId,
    url: `${base}/api/platform/llm/complete-stream`,
  });
  const response = await fetch(`${base}/api/platform/llm/complete-stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Platform LLM stream failed (${response.status})`);
  }

  let result: PlatformLlmCompletionResult | null = null;
  let streamError: string | null = null;
  let sseEventCount = 0;
  let deltaEventCount = 0;
  let deltaChars = 0;

  await readFetchSse(response, (ev) => {
    sseEventCount += 1;
    if (ev.event === 'delta') {
      deltaEventCount += 1;
      const parsed = JSON.parse(ev.data) as {
        text?: string;
        reasoning?: string;
        content?: string;
      };
      const delta = platformLlmStreamDeltaFromPayload(parsed);
      const charLen =
        parsed.text?.length ??
        (parsed.reasoning?.length ?? 0) + (parsed.content?.length ?? 0);
      deltaChars += charLen;
      if (deltaEventCount <= 3 || deltaEventCount % 25 === 0) {
        twAgentStreamDebug('platform SSE delta received', {
          deltaEventCount,
          deltaChars,
          charLen,
          channels: delta?.kind === 'channels',
        });
      }
      if (delta) {
        onDelta(delta);
      }
      return;
    }
    twAgentStreamDebug('platform SSE event', { event: ev.event, sseEventCount });
    if (ev.event === 'done') {
      result = JSON.parse(ev.data) as PlatformLlmCompletionResult;
      return;
    }
    if (ev.event === 'error') {
      const parsed = JSON.parse(ev.data) as { error?: string };
      streamError = parsed.error ?? 'Stream error';
    }
  });

  twAgentStreamDebug('platform complete-stream fetch end', {
    sseEventCount,
    deltaEventCount,
    deltaChars,
    hasResult: Boolean(result),
    streamError,
  });
  if (streamError) {
    throw new Error(streamError);
  }
  if (!result) {
    throw new Error('Platform LLM stream ended without result');
  }
  return result;
}

export function createPlatformAgentTurnDeps(
  actorUserId: number,
  hostAppId?: string,
): PlatformAgentTurnDeps {
  return {
    complete: (request) => requestPlatformLlmCompletion(actorUserId, request, { hostAppId }),
    completeWithStream: (request, onDelta) =>
      requestPlatformLlmCompletionStream(actorUserId, request, onDelta, { hostAppId }),
  };
}
