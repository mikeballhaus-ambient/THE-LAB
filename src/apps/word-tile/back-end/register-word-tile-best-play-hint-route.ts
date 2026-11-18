import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { findWordTileBestPlayHint } from './word-tile-best-play-hint';
import type { TileWordGridState } from './rules';

const BodySchema = z.object({
  state: z.record(z.string(), z.unknown()),
  seat: z.number().int().min(1).max(2),
});

/** Authenticated best-play computation (client shows after Quarks purchase). */
export function registerWordTileBestPlayHintRoute(server: FastifyInstance): void {
  server.post('/api/game-hints/best-play', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      resolveLabAppActorUserId(request);
    } catch {
      await reply.status(401).send({ success: false, error: 'Authentication required' });
      return;
    }
    const parsed = BodySchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.status(400).send({ success: false, error: 'Invalid payload' });
      return;
    }
    const hint = findWordTileBestPlayHint(
      parsed.data.state as unknown as TileWordGridState,
      parsed.data.seat,
    );
    await reply.send({ success: true, data: hint });
  });
}
