import type { FastifyInstance } from 'fastify';
import { databaseManager } from '../db/DatabaseManager';
import { getChromaMemoryHealth } from '../chroma/conversation-memory';
import { getModelTurnRecoveryMetrics } from '@/shared/config/lab-model-turn-recovery-metrics';

export function registerPlatformReadinessRoutes(server: FastifyInstance): void {
  server.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'the-lab-backend' });
  });

  server.get('/ready', async (_request, reply) => {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    try {
      databaseManager.getDb().prepare('SELECT 1').get();
      checks.database = { ok: true };
    } catch (err) {
      checks.database = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }

    const memoryHealth = getChromaMemoryHealth();
    checks.chroma = {
      ok: memoryHealth.status === 'ok',
      detail: memoryHealth.status === 'ok' ? undefined : memoryHealth.message ?? memoryHealth.status,
    };

    const ready = Object.values(checks).every((c) => c.ok);
    return reply.status(ready ? 200 : 503).send({
      ready,
      checks,
      memoryHealth,
      modelTurnRecoveryMetrics: getModelTurnRecoveryMetrics(),
    });
  });
}
