import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { broadcastLabCommsMatchState } from '../comms/lab-comms-match-broadcast';
import { requirePlatformAppServiceToken } from '../middleware/platform-http-auth';

const MatchStateBodySchema = z.object({
  recipientUserIds: z.array(z.number().int().positive()).min(1).max(8),
  matchId: z.string().uuid(),
  match: z.record(z.string(), z.unknown()),
});

export function registerPlatformCommsRoutes(server: FastifyInstance): void {
  server.post(
    '/api/platform/comms/match-state',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requirePlatformAppServiceToken(request, reply)) {
        return;
      }
      const parsed = MatchStateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.message });
      }
      broadcastLabCommsMatchState(parsed.data.recipientUserIds, {
        matchId: parsed.data.matchId,
        match: parsed.data.match,
      });
      return reply.send({ success: true });
    },
  );
}
