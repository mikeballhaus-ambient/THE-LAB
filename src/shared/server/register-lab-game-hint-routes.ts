import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { executeLabGameHintPurchase } from '@/shared/server/lab-game-hint-purchase.node';
import { isLabGameHintServerDevMockEnabled } from '@/shared/game-platform/lab-game-hint-dev-mock';

const HintPurchaseBodySchema = z.object({
  skuId: z.string().min(1).max(64),
  sourceRef: z.string().min(1).max(200),
});

/** POST `/api/game-hints/purchase` — authenticated human spends Quarks for one hint unlock. */
export function registerLabGameHintRoutes(server: FastifyInstance, hostAppId: string): void {
  server.post('/api/game-hints/purchase', async (request: FastifyRequest, reply: FastifyReply) => {
    let userId: number;
    try {
      userId = resolveLabAppActorUserId(request);
    } catch {
      await reply.status(401).send({
        success: false,
        error: 'Authentication required — Authorization Bearer user JWT from THE-LAB login',
      });
      return;
    }
    const parsed = HintPurchaseBodySchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.status(400).send({
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid hint purchase payload',
      });
      return;
    }

    const devMockHeader = request.headers['x-lab-hint-dev-mock'];
    if (devMockHeader === '1' && isLabGameHintServerDevMockEnabled()) {
      await reply.send({
        success: true,
        data: { unlocked: true, balance: null, skippedDuplicate: false, chargedQuarks: 0, devMock: true },
      });
      return;
    }

    try {
      const data = await executeLabGameHintPurchase({
        userId,
        hostAppId,
        skuId: parsed.data.skuId,
        sourceRef: parsed.data.sourceRef,
      });
      await reply.send({ success: true, data });
    } catch (e) {
      await reply.status(400).send({
        success: false,
        error: e instanceof Error ? e.message : 'Hint purchase failed',
      });
    }
  });
}
