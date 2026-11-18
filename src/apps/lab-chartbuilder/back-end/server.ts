/**
 * Chart Builder server — Fastify on the platform app port (3013).
 *
 * Surfaces:
 *   - `/api/v1/charts*`      REST CRUD + render (consumed by `front-end/composables/useCharts.ts`)
 *   - `/api/v1/connectors*`  data connector CRUD + discovery preview
 *   - `/api/connector/*`     catalog CRUD + discovery contracts (Forms Builder / hub)
 *   - `/api/admin/seed-data` Settings → App demo data (`chart-samples` pack)
 *
 * The main backend talks to this app through its SQLite file, not HTTP
 * (`app-seed-data-direct.ts`, `lab-integrations-chart-stub-provisioner.ts`), so the
 * server-side surface only has to satisfy the app UI and connector consumers.
 */
import { z } from 'zod';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerAppSeedDataRoutes } from '@/shared/server/register-app-seed-data-routes';
import { registerHostIntegrationConnectors } from '@/shared/server/register-catalog-connectors';
import { CHART_BUILDER_INTEGRATION_MANIFEST } from '@/backend/db/Apps/integration-manifest-seeds';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { resolvePlatformActorUserId } from '@/shared/services/platform-user-client.node';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { seedChartsIfMissing } from '../db/seed-charts';
import { CHART_BUILDER_APP_ID } from '@/shared/config/chart-builder-url';
import { DEFAULT_CHART_BUILDER_PORT } from './utils/api-version';
import { ChartService } from './services/chart-service';
import { registerChartRoutes } from './routes/charts';
import { registerChartLoadRoutes } from './routes/load';
import { registerChartRenderRoutes } from './routes/render';
import { registerConnectorRoutes } from './routes/connectors';
import { chartBuilderSeedHandlers } from './seed-data/chart-builder-seed-handlers';
import type { ChartSchema } from '@/shared/charts/chart-types';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_CHART_BUILDER_PORT;

const start = async (): Promise<void> => {
  const proxy = AppDatabaseServiceProxy.getInstance();
  await proxy.initialize();
  const db = proxy.getDb();

  const charts = proxy.getChartsRepository();
  const connectors = proxy.getDataConnectorsRepository();

  // Boot seed — chart definitions the host apps bind to. Idempotent, and suppressed after an
  // admin Remove (the boot flag is honoured by the Settings handler, not here).
  seedChartsIfMissing(charts);

  const service = new ChartService({ charts, connectors }, db);

  const ChartConnectorSchema = z.object({
    chartKey: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
    chartType: z.enum(['bar', 'line', 'pie', 'doughnut', 'funnel']),
    options: z.record(z.string(), z.unknown()).default({}),
    layout: z.record(z.string(), z.unknown()).optional(),
    dataConnectorId: z.number().int().positive().nullish(),
    dataMapping: z.unknown().optional(),
    allowedFilters: z.array(z.unknown()).optional(),
  });
  const parseChart = catalogZodParse(ChartConnectorSchema);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    healthExtras: () => ({ app: 'chart-builder' }),
    onSocketConnection: () => {
      /* REST-driven app; the socket is kept for platform parity. */
    },
    registerRoutes: async (server) => {
      // REST surface consumed by the app UI.
      registerChartRoutes(server, service);
      registerChartLoadRoutes(server, service);
      registerChartRenderRoutes(server, service);
      registerConnectorRoutes(server, service);

      // Catalog connectors — `/api/connector/charts` + `/api/connector/data-connectors`.
      await registerHostIntegrationConnectors(server, {
        hostAppId: CHART_BUILDER_APP_ID,
        manifest: CHART_BUILDER_INTEGRATION_MANIFEST,
        discoveryAppFolder: 'chart-builder',
        handlersBySegment: {
        charts: {
          list: () => charts.findAll({ limit: 500 }).charts,
          getById: (id) => {
            const all = charts.findAll({ limit: 500 }).charts;
            return all.find((chart, index) => index + 1 === id) ?? all.find((chart) => chart.chartKey === String(id)) ?? null;
          },
          parseCreate: parseChart,
          parseUpdate: parseChart,
          create: (body) => charts.create(body as ChartSchema),
          update: (id, body) => {
            const chart = charts.findAll({ limit: 500 }).charts.find(
              (row, index) => index + 1 === id || row.chartKey === String(id),
            );
            return chart ? charts.update(chart.chartKey, body as Partial<ChartSchema>) : null;
          },
          delete: (id) => {
            const chart = charts.findAll({ limit: 500 }).charts.find(
              (row, index) => index + 1 === id || row.chartKey === String(id),
            );
            return chart ? charts.delete(chart.chartKey) : false;
          },
          toConnector: (chart) => chart as unknown as Record<string, unknown>,
        },
        'data-connectors': {
          list: () => connectors.findAll(),
          getById: (id) => connectors.findById(coerceConnectorNumericId(id)),
          parseCreate: (body) => body as never,
          parseUpdate: (body) => body as never,
          create: (body) =>
            connectors.create({
              appName: String((body as Record<string, unknown>).appName ?? ''),
              entityName: String((body as Record<string, unknown>).entityName ?? ''),
              discoveryUrl: String((body as Record<string, unknown>).discoveryUrl ?? ''),
            }),
          update: (id, body) => {
            const patch = body as Record<string, unknown>;
            return connectors.update(coerceConnectorNumericId(id), {
              appName: patch.appName as string | undefined,
              entityName: patch.entityName as string | undefined,
              discoveryUrl: patch.discoveryUrl as string | undefined,
              isActive: patch.isActive as boolean | undefined,
            });
          },
          delete: (id) => connectors.delete(coerceConnectorNumericId(id)),
          toConnector: (row) => row as unknown as Record<string, unknown>,
        },
        },
      });

      registerAppSeedDataRoutes(server, chartBuilderSeedHandlers);
      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);

  // `resolvePlatformActorUserId` is deliberately imported so the connector path has the same
  // service-token semantics as the other catalog apps.
  void resolvePlatformActorUserId;
};

export const startServer = start;
