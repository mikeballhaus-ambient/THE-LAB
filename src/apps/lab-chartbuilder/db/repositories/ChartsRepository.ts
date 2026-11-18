import type { Database, RunResult } from 'better-sqlite3';
import type { ChartSchema } from '@/shared/charts/chart-types';
import type { ChartDataMapping, ChartFilterSpec } from '@/shared/charts/chart-data-mapping';

/**
 * Chart definitions in the app's own SQLite DB.
 *
 * `charts` is the seed/asset table; `chart_data_connectors` holds the discovery sources a
 * chart can be bound to. Both are read by the main backend (stub provisioner, binding
 * seeders, provider unbind), so the column names here are a cross-repo contract.
 *
 * **Column tolerance.** The connector/mapping columns were added after the first `charts`
 * table shipped, and test fixtures (`seed-charts.test.ts`) still create the original column
 * set. Reads and writes therefore probe `PRAGMA table_info` and only touch columns that
 * exist — the same defensive shape as `demo-seed-columns.insertRow`.
 */

interface ChartRow {
  id: number;
  chart_key: string;
  name: string;
  description: string | null;
  chart_type: string;
  /** Nullable in the fixture schema built by the main-backend integration tests. */
  options_json: string | null;
  layout_json: string | null;
  data_connector_id?: number | null;
  data_mapping_json?: string | null;
  allowed_filters_json?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ChartListParams {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ChartListResult {
  charts: ChartSchema[];
  total: number;
  limit: number;
  offset: number;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapRow(row: ChartRow): ChartSchema {
  return {
    chartKey: row.chart_key,
    name: row.name,
    description: row.description ?? undefined,
    is_active: row.is_active === 1,
    chartType: row.chart_type as ChartSchema['chartType'],
    options: parseJson(row.options_json, {}),
    layout: row.layout_json ? parseJson(row.layout_json, undefined) : undefined,
    dataConnectorId: row.data_connector_id ?? undefined,
    dataMapping: row.data_mapping_json
      ? parseJson<ChartDataMapping | null>(row.data_mapping_json, null) ?? undefined
      : undefined,
    allowedFilters: row.allowed_filters_json
      ? parseJson<ChartFilterSpec[] | null>(row.allowed_filters_json, null) ?? undefined
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ChartsRepository {
  /** Cached column set for this handle — `charts` is created once per DB. */
  private columnsCache: Set<string> | null = null;

  constructor(private readonly db: Database) {}

  private columns(): Set<string> {
    if (!this.columnsCache) {
      const rows = this.db.prepare('PRAGMA table_info(charts)').all() as { name: string }[];
      this.columnsCache = new Set(rows.map((row) => row.name));
    }
    return this.columnsCache;
  }

  private has(column: string): boolean {
    return this.columns().has(column);
  }

  findAll(params: ChartListParams = {}): ChartListResult {
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const offset = Math.max(params.offset ?? 0, 0);
    const where: string[] = [];
    const args: Array<string | number> = [];

    if (params.isActive !== undefined) {
      where.push('is_active = ?');
      args.push(params.isActive ? 1 : 0);
    }
    const whereSql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

    const total = (
      this.db.prepare(`SELECT COUNT(*) AS c FROM charts${whereSql}`).get(...args) as { c: number }
    ).c;

    const rows = this.db
      .prepare(`SELECT * FROM charts${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset) as ChartRow[];

    return { charts: rows.map(mapRow), total, limit, offset };
  }

  findByKey(chartKey: string): ChartSchema | null {
    const row = this.db.prepare('SELECT * FROM charts WHERE chart_key = ? LIMIT 1').get(chartKey) as
      | ChartRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  create(schema: ChartSchema): ChartSchema {
    const values: Record<string, string | number | null> = {
      chart_key: schema.chartKey,
      name: schema.name,
      description: schema.description ?? null,
      chart_type: schema.chartType,
      options_json: JSON.stringify(schema.options ?? {}),
      layout_json: schema.layout ? JSON.stringify(schema.layout) : null,
      is_active: schema.is_active === false ? 0 : 1,
    };
    if (this.has('data_connector_id')) {
      values.data_connector_id = schema.dataConnectorId ?? null;
    }
    if (this.has('data_mapping_json')) {
      values.data_mapping_json = schema.dataMapping ? JSON.stringify(schema.dataMapping) : null;
    }
    if (this.has('allowed_filters_json')) {
      values.allowed_filters_json = schema.allowedFilters
        ? JSON.stringify(schema.allowedFilters)
        : null;
    }

    const keys = Object.keys(values);
    const result = this.db
      .prepare(
        `INSERT INTO charts (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      )
      .run(...keys.map((key) => values[key])) as RunResult;

    const row = this.db
      .prepare('SELECT * FROM charts WHERE id = ?')
      .get(result.lastInsertRowid) as ChartRow;
    return mapRow(row);
  }

  /** Update by chart key. Merges onto the existing row so partial patches are safe. */
  update(chartKey: string, patch: Partial<ChartSchema>): ChartSchema | null {
    const existing = this.db
      .prepare('SELECT * FROM charts WHERE chart_key = ? LIMIT 1')
      .get(chartKey) as ChartRow | undefined;
    if (!existing) {
      return null;
    }

    const values: Record<string, string | number | null> = {
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      chart_type: patch.chartType ?? existing.chart_type,
      options_json:
        patch.options !== undefined
          ? JSON.stringify(patch.options)
          : existing.options_json,
      layout_json:
        patch.layout !== undefined
          ? patch.layout
            ? JSON.stringify(patch.layout)
            : null
          : existing.layout_json,
      is_active:
        (patch.is_active ?? existing.is_active === 1) ? 1 : 0,
    };
    if (this.has('data_connector_id')) {
      values.data_connector_id =
        patch.dataConnectorId !== undefined
          ? (patch.dataConnectorId ?? null)
          : (existing.data_connector_id ?? null);
    }
    if (this.has('data_mapping_json')) {
      values.data_mapping_json =
        patch.dataMapping !== undefined
          ? patch.dataMapping
            ? JSON.stringify(patch.dataMapping)
            : null
          : (existing.data_mapping_json ?? null);
    }
    if (this.has('allowed_filters_json')) {
      values.allowed_filters_json =
        patch.allowedFilters !== undefined
          ? patch.allowedFilters
            ? JSON.stringify(patch.allowedFilters)
            : null
          : (existing.allowed_filters_json ?? null);
    }

    const keys = Object.keys(values);
    this.db
      .prepare(
        `UPDATE charts SET ${keys.map((key) => `${key} = ?`).join(', ')},
           updated_at = CURRENT_TIMESTAMP
         WHERE chart_key = ?`,
      )
      .run(...keys.map((key) => values[key]), chartKey);

    return this.findByKey(chartKey);
  }

  delete(chartKey: string): boolean {
    const result = this.db.prepare('DELETE FROM charts WHERE chart_key = ?').run(chartKey);
    return result.changes > 0;
  }
}
