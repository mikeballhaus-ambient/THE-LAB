import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { labVirtualBankService } from '../db/LabVirtualBank/lab-virtual-bank-service';
import {
  requirePlatformAppServiceToken,
  requirePlatformHttpUser,
} from '../middleware/platform-http-auth';

const AdjustSchema = z.object({
  userId: z.number().int().positive(),
  delta: z.number().int().refine((n) => n !== 0, 'delta must be non-zero'),
  reasonCode: z.enum([
    'account_opening',
    'daily_accrual',
    'game_win_reward',
    'game_pot_win',
    'game_pot_loss',
    'poll_reward',
    'activity_reward',
    'hint_purchase',
    'manual_adjustment',
  ]),
  reasonLabel: z.string().min(1).max(200),
  sourceAppId: z.string().min(1).max(120).optional(),
  sourceRef: z.string().min(1).max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function registerLabVirtualBankRoutes(server: FastifyInstance): void {
  server.get('/api/platform/virtual-bank', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requirePlatformHttpUser(request, reply);
    if (!user) {
      return;
    }
    const view = labVirtualBankService.getAccountView(user.userId);
    return reply.send({ success: true, data: view });
  });

  server.get(
    '/api/platform/virtual-bank/ledger',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requirePlatformHttpUser(request, reply);
      if (!user) {
        return;
      }
      const q = request.query as { limit?: string };
      const limit =
        q.limit != null ? Math.min(100, Math.max(1, Number.parseInt(q.limit, 10) || 25)) : 25;
      const entries = labVirtualBankService.listLedger(user.userId, limit);
      return reply.send({ success: true, data: entries });
    },
  );

  server.post(
    '/api/platform/virtual-bank/adjust',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requirePlatformAppServiceToken(request, reply)) {
        return;
      }
      const parsed = AdjustSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Invalid adjustment payload',
        });
      }
      try {
        const result = labVirtualBankService.adjust(parsed.data);
        return reply.send({ success: true, data: result });
      } catch (e) {
        return reply.status(400).send({
          success: false,
          error: e instanceof Error ? e.message : 'Adjustment failed',
        });
      }
    },
  );
}
