import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ChartService } from '../services/chart-service';

/**
 * `GET /api/v1/charts/load/:chartKey` — the definition only, no data.
 *
 * Separate from `GET /api/v1/charts/:chartKey` because hosts that embed a chart call this
 * first to decide whether the chart is connector-backed (and therefore needs `context` at
 * render time rather than `data`).
 */
export function registerChartLoadRoutes(server: FastifyInstance, service: ChartService): void {
  const load = async (
    request: FastifyRequest<{ Params: { chartKey: string } }>,
    reply: FastifyReply,
  ) => {
    const chart = service.get(request.params.chartKey);
    if (!chart) {
      return reply.status(404).send({ error: `Chart not found: ${request.params.chartKey}` });
    }
    return chart;
  };

  server.get('/api/v1/charts/load/:chartKey', load);
}
