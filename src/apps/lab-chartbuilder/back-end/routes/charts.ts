import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { ChartSchema } from '@/shared/charts/chart-types';
import type { ChartService } from '../services/chart-service';

/**
 * `/api/v1/charts` — CRUD for chart definitions (render lives in `render.ts`).
 *
 * Paths and payloads are fixed by `front-end/composables/useCharts.ts` and by
 * `chart-builder-app-instructions.ts` (API section).
 */

const ChartTypeSchema = z.enum(['bar', 'line', 'pie', 'doughnut', 'funnel']);

const ChartOptionsSchema = z
  .object({
    title: z.string().optional(),
    legendDisplay: z.boolean().optional(),
    legendPosition: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    showDataLabels: z.boolean().optional(),
    maintainAspectRatio: z.boolean().optional(),
    indexAxis: z.enum(['x', 'y']).optional(),
    stacked: z.boolean().optional(),
  })
  .passthrough();

const ChartLayoutSchema = z
  .object({
    size: z.number().min(50).max(150).optional(),
    minHeight: z.number().optional(),
    maintainAspectRatio: z.boolean().optional(),
  })
  .passthrough();

const ChartDataMappingSchema = z.union([
  z
    .object({
      mode: z.literal('aggregate'),
      groupByField: z.string().min(1),
      measure: z.enum(['count', 'sum', 'avg']),
      measureField: z.string().optional(),
      labelField: z.string().optional(),
      datasetLabel: z.string().optional(),
    })
    .strict(),
  z.object({ mode: z.literal('passthrough') }).strict(),
]);

const ChartFilterSpecSchema = z
  .object({
    contextKey: z.string().min(1),
    targetParam: z.string().min(1),
    required: z.boolean().optional(),
  })
  .strict();

const ChartUpsertSchema = z.object({
  chartKey: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  chartType: ChartTypeSchema,
  options: ChartOptionsSchema.default({}),
  layout: ChartLayoutSchema.optional(),
  dataConnectorId: z.number().int().positive().nullish(),
  dataMapping: ChartDataMappingSchema.nullish(),
  allowedFilters: z.array(ChartFilterSpecSchema).optional(),
});

const ChartPatchSchema = ChartUpsertSchema.partial().omit({ chartKey: true });

function toSchema(body: z.infer<typeof ChartUpsertSchema>): ChartSchema {
  return {
    chartKey: body.chartKey,
    name: body.name,
    description: body.description,
    is_active: body.is_active,
    chartType: body.chartType,
    options: body.options,
    layout: body.layout,
    dataConnectorId: body.dataConnectorId ?? undefined,
    dataMapping: body.dataMapping ?? undefined,
    allowedFilters: body.allowedFilters,
  };
}

function sendError(reply: FastifyReply, status: number, error: string): FastifyReply {
  return reply.status(status).send({ error });
}

export function registerChartRoutes(server: FastifyInstance, service: ChartService): void {
  server.get('/api/v1/charts', async (request: FastifyRequest) => {
    const query = request.query as { isActive?: string; limit?: string; offset?: string };
    const params: { isActive?: boolean; limit?: number; offset?: number } = {};
    if (query.isActive !== undefined) {
      params.isActive = query.isActive === 'true' || query.isActive === '1';
    }
    if (query.limit) {
      params.limit = Number(query.limit);
    }
    if (query.offset) {
      params.offset = Number(query.offset);
    }
    return service.list(params);
  });

  server.get('/api/v1/charts/:chartKey', async (request, reply) => {
    const { chartKey } = request.params as { chartKey: string };
    const chart = service.get(chartKey);
    return chart ? chart : sendError(reply, 404, `Chart not found: ${chartKey}`);
  });

  server.post('/api/v1/charts', async (request, reply) => {
    const parsed = ChartUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.message);
    }
    const schema = toSchema(parsed.data);
    const created = service.create(schema);
    if (created === 'conflict') {
      return sendError(reply, 409, `Chart already exists: ${schema.chartKey}`);
    }
    return reply.status(201).send(created);
  });

  server.put('/api/v1/charts/:chartKey', async (request, reply) => {
    const { chartKey } = request.params as { chartKey: string };
    const parsed = ChartPatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.message);
    }
    const updated = service.update(chartKey, parsed.data as Partial<ChartSchema>);
    return updated ? updated : sendError(reply, 404, `Chart not found: ${chartKey}`);
  });

  server.delete('/api/v1/charts/:chartKey', async (request, reply) => {
    const { chartKey } = request.params as { chartKey: string };
    const deleted = service.remove(chartKey);
    return deleted ? { success: true } : sendError(reply, 404, `Chart not found: ${chartKey}`);
  });
}
