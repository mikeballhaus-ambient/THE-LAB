// Template-derived proxy for the Chart Builder app DB.
//
// The main backend imports this module directly (chart stub provisioner, binding seeders,
// provider unbind, provider-asset validation) and expects `initialize()`,
// `getDb()`, `getChartsRepository()` and `getDataConnectorsRepository()`.

import type { Database } from 'better-sqlite3';
import { AppDatabaseService } from '@/backend/AppDatabaseService';
import type {
  IAddTableParams,
  IRemoveTableParams,
  IAddColumnParams,
  IRemoveColumnParams,
  ISelectParams,
  IInsertParams,
  IUpdateParams,
  IDeleteParams,
  IExecuteRawParams,
  ICRUDSuccessResponse,
  ISelectResponse,
  IInsertResponse,
  IUpdateResponse,
  IDeleteResponse,
  IExecuteRawResponse,
} from '@/shared/types/app/app-database';
import { ChartsRepository } from './repositories/ChartsRepository';
import { seedChartsIfMissing } from './seed-charts';
import { DataConnectorsRepository } from './repositories/DataConnectorsRepository';

const APP_ID = 'lab-chartbuilder';

/**
 * Chart Builder tables.
 *
 * `charts` column set is fixed by `src/tests/apps/chart-builder/seed-charts.test.ts` and by
 * `app-seed-data-direct.ts` (which creates the same shape when seeding offline).
 */
const CREATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chart_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    chart_type TEXT NOT NULL,
    options_json TEXT NOT NULL DEFAULT '{}',
    layout_json TEXT,
    data_connector_id INTEGER,
    data_mapping_json TEXT,
    allowed_filters_json TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_charts_chart_key ON charts(chart_key);
  CREATE INDEX IF NOT EXISTS idx_charts_is_active ON charts(is_active);
  CREATE INDEX IF NOT EXISTS idx_charts_data_connector ON charts(data_connector_id);

  CREATE TABLE IF NOT EXISTS data_connectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    discovery_url TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_data_connectors_app_entity
    ON data_connectors(app_name, entity_name);
`;

export class AppDatabaseServiceProxy {
  private static instance: AppDatabaseServiceProxy | null = null;
  private baseServiceInstance!: AppDatabaseService;
  private chartsRepository: ChartsRepository | null = null;
  private connectorsRepository: DataConnectorsRepository | null = null;

  private constructor() {
    /* singleton */
  }

  public static getInstance(): AppDatabaseServiceProxy {
    if (!this.instance) {
      this.instance = new AppDatabaseServiceProxy();
    }
    return this.instance;
  }

  /**
   * Create the schema and ensure the platform sample charts exist.
   *
   * Seeding here — rather than only via the Settings repair path — is what keeps a fresh
   * database useful: every host app's `chart.surface` slot resolves to a seeded definition, so
   * a new install does not open to empty charts. `seedChartsIfMissing` is idempotent and also
   * repairs the `showDataLabels` default on older rows.
   *
   * This mirrors `src/apps/chart-builder/db/app-db-service.ts`, which always seeded. The two
   * drifted when this proxy was introduced, leaving the app core actually imports as the one
   * that did not seed.
   */
  public async initialize(): Promise<void> {
    if (!this.baseServiceInstance) {
      this.baseServiceInstance = await AppDatabaseService.getInstance(APP_ID);
    }
    const db = this.baseServiceInstance.getDb();
    db.exec(CREATE_SCHEMA);
    seedChartsIfMissing(this.getChartsRepository());
  }

  /** Raw better-sqlite3 handle. */
  public getDb(): Database {
    return this.baseServiceInstance.getDb();
  }

  public getChartsRepository(): ChartsRepository {
    if (!this.chartsRepository) {
      this.chartsRepository = new ChartsRepository(this.getDb());
    }
    return this.chartsRepository;
  }

  public getDataConnectorsRepository(): DataConnectorsRepository {
    if (!this.connectorsRepository) {
      this.connectorsRepository = new DataConnectorsRepository(this.getDb());
    }
    return this.connectorsRepository;
  }

  public async addTable({ tableName, schema }: IAddTableParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.addTable({ tableName, schema })) as ICRUDSuccessResponse;
  }

  public async removeTable({ tableName }: IRemoveTableParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.removeTable({ tableName })) as ICRUDSuccessResponse;
  }

  public async addColumn({
    tableName,
    columnName,
    columnType,
    nullable,
    default: defaultVal,
    primaryKey,
    foreignKey,
  }: IAddColumnParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.addColumn({
      tableName,
      columnName,
      columnType,
      nullable,
      default: defaultVal,
      primaryKey,
      foreignKey,
    })) as ICRUDSuccessResponse;
  }

  public async removeColumn({
    tableName,
    columnName,
    cascadeForeignKeys,
  }: IRemoveColumnParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.removeColumn({
      tableName,
      columnName,
      cascadeForeignKeys,
    })) as ICRUDSuccessResponse;
  }

  public async select({
    sql,
    params,
    limit = 1000,
    offset = 0,
  }: ISelectParams): Promise<ISelectResponse> {
    return (await this.baseServiceInstance.select({ sql, params, limit, offset })) as ISelectResponse;
  }

  public async insert({ tableName, data }: IInsertParams): Promise<IInsertResponse> {
    return (await this.baseServiceInstance.insert({ tableName, data })) as IInsertResponse;
  }

  public async update({ tableName, data, where }: IUpdateParams): Promise<IUpdateResponse> {
    return (await this.baseServiceInstance.update({ tableName, data, where })) as IUpdateResponse;
  }

  public async delete({ tableName, where }: IDeleteParams): Promise<IDeleteResponse> {
    return (await this.baseServiceInstance.delete({ tableName, where })) as IDeleteResponse;
  }

  public async executeRaw({ sql, params }: IExecuteRawParams): Promise<IExecuteRawResponse> {
    return (await this.baseServiceInstance.executeRaw({ sql, params })) as IExecuteRawResponse;
  }
}
