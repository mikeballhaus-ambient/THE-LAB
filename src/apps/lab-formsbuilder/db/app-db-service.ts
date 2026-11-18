/**
 * Forms Builder App Database Service Proxy.
 * Provides simplified interface for database operations and repository access.
 */

import { AppDatabaseService } from '@/backend/AppDatabaseService';
import {
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
  IExecuteRawResponse
} from '@/shared/types/app/app-database';
import { FormsRepository, DataConnectorsRepository, SubmissionsRepository } from './repositories';
import type { Database } from 'better-sqlite3';

/**
 * Interface for database bootstrap options.
 */
export interface BootstrapOptions {
  seedTestData?: boolean;
}

/**
 * This class provides a simplified interface for database operations and repository access.
 */
export class AppDatabaseServiceProxy {
  private static instance: AppDatabaseServiceProxy | null = null;
  private baseServiceInstance!: AppDatabaseService;
  private formsRepository!: FormsRepository;
  private dataConnectorsRepository!: DataConnectorsRepository;
  private submissionsRepository!: SubmissionsRepository;

  private constructor() { }

  public static getInstance(): AppDatabaseServiceProxy {
    if (!this.instance) {
      this.instance = new AppDatabaseServiceProxy();
    }
    return this.instance;
  }

  /**
   * Initialize the database service and bootstrap tables.
   * @param options - Bootstrap options (e.g., seedTestData)
   */
  public async initialize(): Promise<void> {
    this.baseServiceInstance = await AppDatabaseService.getInstance('lab-formsbuilder');

    // Apply migrations to create tables
    await this.bootstrapTables();

    // Initialize repositories
    const db = this.baseServiceInstance.getDb();
    this.formsRepository = new FormsRepository(db);
    this.dataConnectorsRepository = new DataConnectorsRepository(db);
    this.submissionsRepository = new SubmissionsRepository(db);
  }

  /**
   * Bootstrap database tables by applying migrations.
   */
  private async bootstrapTables(): Promise<void> {
    const db = this.baseServiceInstance.getDb();

    // Create data_connectors table first (forms depends on it)
    db.exec(`
      CREATE TABLE IF NOT EXISTS data_connectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        discovery_url TEXT NOT NULL,
        discovery_type TEXT DEFAULT 'GET',
        entity_model TEXT,
        endpoints TEXT,
        capabilities TEXT,
        is_active INTEGER DEFAULT 1,
        last_verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create forms table with proper foreign key column name
    db.exec(`
      CREATE TABLE IF NOT EXISTS forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        data_connector_id INTEGER REFERENCES data_connectors(id),
        schema_json TEXT NOT NULL,
        components_json TEXT NOT NULL,
        validation_json TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for forms table
    db.exec('CREATE INDEX IF NOT EXISTS idx_forms_form_key ON forms(form_key);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_forms_data_connector_id ON forms(data_connector_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);');

    // Create indexes for data_connectors table
    db.exec('CREATE INDEX IF NOT EXISTS idx_connectors_app_name ON data_connectors(app_name);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_connectors_entity_name ON data_connectors(entity_name);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON data_connectors(is_active);');

    // Create form_submissions table with proper foreign key references
    db.exec(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_key TEXT NOT NULL REFERENCES forms(form_key),  -- FK to forms table
        data_connector_id INTEGER NOT NULL REFERENCES data_connectors(id),  -- FK to data_connectors table
        data TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for form_submissions table
    db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_form_key ON form_submissions(form_key);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_data_connector_id ON form_submissions(data_connector_id);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_status ON form_submissions(status);');

    // Create migration tracking table
    db.exec(`
      CREATE TABLE IF NOT EXISTS forms_builder_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      )
    `);

    // Record this migration as applied
    db.prepare(
      'INSERT OR IGNORE INTO forms_builder_migrations (migration_name, description) VALUES (?, ?)'
    ).run('v1_initial_schema', 'Initial Forms Builder schema with forms, data_connectors, and form_submissions tables');

    console.log('[BOOTSTRAP]: Database tables created successfully');
  }

  // ==================== Proxy Methods ====================

  public async addTable({ tableName, schema }: IAddTableParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.addTable({ tableName, schema }) as ICRUDSuccessResponse;
  }

  public async removeTable({ tableName }: IRemoveTableParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.removeTable({ tableName }) as ICRUDSuccessResponse;
  }

  public async addColumn({ tableName, columnName, columnType, nullable, default: defaultVal, primaryKey, foreignKey }: IAddColumnParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.addColumn({ tableName, columnName, columnType, nullable, default: defaultVal, primaryKey, foreignKey }) as ICRUDSuccessResponse;
  }

  public async removeColumn({ tableName, columnName, cascadeForeignKeys }: IRemoveColumnParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.removeColumn({ tableName, columnName, cascadeForeignKeys }) as ICRUDSuccessResponse;
  }

  public async select({ sql, params, limit = 1000, offset = 0 }: ISelectParams): Promise<ISelectResponse> {
    return await this.baseServiceInstance.select({ sql, params, limit, offset }) as ISelectResponse;
  }

  public async insert({ tableName, data }: IInsertParams): Promise<IInsertResponse> {
    return await this.baseServiceInstance.insert({ tableName, data }) as IInsertResponse;
  }

  public async update({ tableName, data, where }: IUpdateParams): Promise<IUpdateResponse> {
    return await this.baseServiceInstance.update({ tableName, data, where }) as IUpdateResponse;
  }

  public async delete({ tableName, where }: IDeleteParams): Promise<IDeleteResponse> {
    return await this.baseServiceInstance.delete({ tableName, where }) as IDeleteResponse;
  }

  public async executeRaw({ sql, params }: IExecuteRawParams): Promise<IExecuteRawResponse> {
    return await this.baseServiceInstance.executeRaw({ sql, params }) as IExecuteRawResponse;
  }

  // ==================== Repository Accessors ====================

  /**
   * Get FormsRepository instance.
   */
  public getFormsRepository(): FormsRepository {
    if (!this.formsRepository) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.formsRepository;
  }

  /**
   * Get DataConnectorsRepository instance.
   */
  public getDataConnectorsRepository(): DataConnectorsRepository {
    if (!this.dataConnectorsRepository) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataConnectorsRepository;
  }

  /**
   * Get SubmissionsRepository instance.
   */
  public getSubmissionsRepository(): SubmissionsRepository {
    if (!this.submissionsRepository) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.submissionsRepository;
  }

  /**
   * Get raw database connection.
   */
  public getDb(): Database {
    return this.baseServiceInstance.getDb();
  }
}
