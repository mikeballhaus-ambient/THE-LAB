/**
 * Generic SSE helper for agent-turn streaming (app server → client).
 *
 * Generalizes Word Tile's `agent-turn-sse.ts`: writes `event:`/`data:` frames
 * to a hijacked Fastify raw response.
 */
import type { ServerResponse } from 'node:http';

export type AgentTurnSseSend = (event: string, data: unknown) => void;

export function startAgentTurnSse(res: ServerResponse): AgentTurnSseSend {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  return (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}
