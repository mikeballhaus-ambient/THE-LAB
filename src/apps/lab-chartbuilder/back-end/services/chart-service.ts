import type { Database } from 'better-sqlite3';
import type {
  ChartDataPayload,
  ChartRenderRequest,
  ChartRenderResponse,
  ChartSchema,
} from '@/shared/charts/chart-types';
import { aggregateRowsToChartData, dateRangeSeriesRowsToChartData } from '@/shared/charts/chart-data-mapping';
import { ChartsRepository } from '../../db/repositories/ChartsRepository';
import { DataConnectorsRepository } from '../../db/repositories/DataConnectorsRepository';
import {
  buildFilterParams,
  resolveAllowedFiltersForGetAll,
  withFilterParams,
} from './chart-connector-data';
import {
  buildConnectorRequestHeaders,
  resolveConnectorRowsUrl,
} from './connector-request';

/**
 * Chart rendering.
 *
 * Two modes, both served by `POST /api/v1/charts/render/:chartKey`:
 *   - **host-supplied** — the host passes `data` and Chart Builder just echoes the schema.
 *   - **connector-backed** — the chart has `dataConnectorId` + `dataMapping`; Chart Builder
 *     calls the connector's discovery URL with filters derived from `context` and aggregates
 *     the rows server-side.
 */

export interface ChartServiceDeps {
  charts: ChartsRepository;
  connectors: DataConnectorsRepository;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

interface DiscoveryRowResponse {
  rows?: unknown;
  records?: unknown;
  data?: unknown;
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }
  if (payload && typeof payload === 'object') {
    const body = payload as DiscoveryRowResponse;
    for (const candidate of [body.rows, body.records, body.data]) {
      if (Array.isArray(candidate)) {
        return candidate as Record<string, unknown>[];
      }
    }
  }
  return [];
}

export class ChartService {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly deps: ChartServiceDeps,
    private readonly db: Database,
  ) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  /** `GET /api/v1/charts` */
  list(params: { isActive?: boolean; limit?: number; offset?: number } = {}) {
    return this.deps.charts.findAll(params);
  }

  /** `GET /api/v1/charts/:chartKey` */
  get(chartKey: string): ChartSchema | null {
    return this.deps.charts.findByKey(chartKey);
  }

  /** `POST /api/v1/charts` — 409 when the key already exists. */
  create(schema: ChartSchema): ChartSchema | 'conflict' {
    if (this.deps.charts.findByKey(schema.chartKey)) {
      return 'conflict';
    }
    return this.deps.charts.create(schema);
  }

  /** `PUT /api/v1/charts/:chartKey` */
  update(chartKey: string, patch: Partial<ChartSchema>): ChartSchema | null {
    return this.deps.charts.update(chartKey, patch);
  }

  /** `DELETE /api/v1/charts/:chartKey` */
  remove(chartKey: string): boolean {
    return this.deps.charts.delete(chartKey);
  }

  /** Connector CRUD surface used by `/api/v1/connectors`. */
  get connectors(): DataConnectorsRepository {
    return this.deps.connectors;
  }

  /**
   * `POST /api/v1/charts/render/:chartKey`
   *
   * Throws `chart_not_found` when the key is unknown and `connector_not_found` when a
   * connector-backed chart points at a missing connector row.
   */
  async render(
    chartKey: string,
    body: ChartRenderRequest = {},
    options: { actorUserId?: number | null } = {},
  ): Promise<ChartRenderResponse> {
    const schema = this.deps.charts.findByKey(chartKey);
    if (!schema) {
      throw new Error(`chart_not_found:${chartKey}`);
    }

    const size = body.size ?? schema.layout?.size ?? 100;

    // Host-supplied data wins — legacy seeds and manual embeds.
    if (body.data) {
      return {
        schema,
        data: body.data,
        size,
        optionsOverride: body.optionsOverride,
      };
    }

    const data = await this.resolveConnectorData(schema, body.context, options.actorUserId);
    return { schema, data, size, optionsOverride: body.optionsOverride };
  }

  private async resolveConnectorData(
    schema: ChartSchema,
    context: Record<string, unknown> | undefined,
    actorUserId?: number | null,
  ): Promise<ChartDataPayload> {
    if (schema.dataConnectorId == null) {
      // No connector and no host data — render an empty but well-formed payload.
      return { labels: [], datasets: [] };
    }

    const connector = this.deps.connectors.findById(schema.dataConnectorId);
    if (!connector) {
      throw new Error(`connector_not_found:${schema.dataConnectorId}`);
    }

    const filters = buildFilterParams(schema.allowedFilters, context);
    // Provisioned connectors store the discovery URL; the rows live at the contract's
    // `crud.getAll` endpoint, and the host app requires auth. Both are resolved here so a
    // single request returns data instead of a 401 or an empty contract body.
    const discoveryUrl = connector.discoveryUrl;
    const discoveryResponse = await this.fetchImpl(discoveryUrl, {
      headers: {
        Accept: 'application/json',
        ...buildConnectorRequestHeaders(discoveryUrl, actorUserId),
      },
    });
    if (!discoveryResponse.ok) {
      throw new Error(`connector_http_${discoveryResponse.status}`);
    }
    const discoveryPayload = (await discoveryResponse.json()) as unknown;

    const rowsUrl = withFilterParams(
      resolveConnectorRowsUrl(discoveryUrl, discoveryPayload),
      filters,
    );
    const response = await this.fetchImpl(rowsUrl, {
      headers: {
        Accept: 'application/json',
        ...buildConnectorRequestHeaders(rowsUrl, actorUserId),
      },
    });
    if (!response.ok) {
      throw new Error(`connector_http_${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    const rows = extractRows(payload);

    if (schema.dataMapping?.mode === 'aggregate') {
      return aggregateRowsToChartData(rows, schema.dataMapping);
    }

    if (schema.dataMapping?.mode === 'dateRangeSeries') {
      return dateRangeSeriesRowsToChartData(rows, schema.dataMapping);
    }

    // Passthrough: the host/tests supply ChartDataPayload-shaped rows.
    if (rows.length > 0) {
      const first = rows[0] as unknown as ChartDataPayload;
      if (Array.isArray(first?.datasets)) {
        return first;
      }
    }
    return { labels: [], datasets: [] };
  }

  /**
   * Filters a `getAll` connector call may forward — see
   * `chart-connector-data.resolveAllowedFiltersForGetAll`.
   */
  resolveFiltersForGetAll(context: Record<string, unknown> | undefined): string[] {
    const specs = this.deps.charts.findAll().charts.flatMap((chart) => chart.allowedFilters ?? []);
    const key = typeof context?.filterKey === 'string' ? context.filterKey : undefined;
    return resolveAllowedFiltersForGetAll(specs, key).map((spec) => spec.targetParam);
  }
}
