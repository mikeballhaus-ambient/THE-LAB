import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { ChartRenderRequest } from '@/shared/charts/chart-types';
import { getLabAppUserFromRequest } from '@/shared/server/lab-app-http-auth';
import type { ChartService } from '../services/chart-service';

/**
 * `POST /api/v1/charts/render/:chartKey`
 *
 * Body is either `{ data }` (host-computed, legacy seeds) or `{ context }` (connector-backed).
 * Registered here as well as in `charts.ts` so the dedicated route module can be mounted
 * independently by tests and hosts.
 */

const RenderBodySchema = z.object({
  data: z
    .object({
      labels: z.array(z.string()).optional(),
      datasets: z
        .array(
          z.object({
            label: z.string().optional(),
            data: z.array(z.number()),
            backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
            borderColor: z.union([z.string(), z.array(z.string())]).optional(),
            fill: z.union([z.boolean(), z.string()]).optional(),
          }),
        )
        .default([]),
    })
    .optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  size: z.number().min(50).max(150).optional(),
  optionsOverride: z.record(z.string(), z.unknown()).optional(),
});

export function registerChartRenderRoutes(server: FastifyInstance, service: ChartService): void {
  server.post(
    '/api/v1/charts/render/:chartKey',
    async (request: FastifyRequest<{ Params: { chartKey: string } }>, reply: FastifyReply) => {
      const parsed = RenderBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.message });
      }
      // Connector-backed charts read another catalog app, which requires auth. Forward the
      // acting user so Chart Builder can present its service token instead of getting a 401.
      const actorUserId = getLabAppUserFromRequest(request)?.labUserId ?? null;
      try {
        return await service.render(
          request.params.chartKey,
          parsed.data as ChartRenderRequest,
          { actorUserId },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'render_failed';
        if (message.startsWith('chart_not_found')) {
          return reply.status(404).send({ error: message });
        }
        if (message.startsWith('connector_not_found')) {
          return reply.status(422).send({ error: message });
        }
        return reply.status(502).send({ error: message });
      }
    },
  );
}
