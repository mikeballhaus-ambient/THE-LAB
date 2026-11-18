import { Database } from 'better-sqlite3';

/**
 * Reserved table names that cannot be created by users.
 * These names are reserved for standard tables and system use.
 *
 * The reserved `users` table in an app DB is **not** THE-LAB platform identity.
 * Assignees, owners, and agents use main `the_lab.db` users (`lab_user_id`) via
 * `/api/platform/users` — see `docs/platform/platform-identity.md`.
 */
export const RESERVED_TABLES = ['items', 'users', 'configs', 'logs'];

/**
 * Maximum allowed rows for SELECT queries to prevent large result sets.
 */
export const MAX_SELECT_ROWS = 1_000_000;

/**
 * Interface for app database configuration.
 */
export interface IAppDatabaseConfig {
  // Configuration properties
  appName: string;           // Human-readable app name
  appId: string;             // Lowercase, dash-separated unique identifier
  dbLocation: string;        // Full path to database file
  migrationTable: string;    // Migration tracking table name
  standardTables: readonly ['items', 'users', 'configs', 'logs'];

  // Standard table names (reserved)
  items: string;
  users: string;
  configs: string;
  logs: string;

  // Helper methods for checking table/column existence
  tableExists(tableName: string): Promise<boolean>;
  columnExists(tableName: string, columnName: string): Promise<boolean>;
  getIndexInfo(tableName: string): Promise<Record<string, string[]>>;

  // Schema validation
  validateTableName(tableName: string): Promise<boolean>;

  // Migration tracking
  migrationTableExists(): Promise<boolean>;

  // Internal methods (used by AppDatabaseService)
  _getAppName(): string;
  _getAppId(): string;
  _getMigrationTable(): string;
  _getDb(): Database
}

/**
 * Interface for select parameters.
 */
export interface ISelectParams {
  sql: string;
  params?: unknown[];
  limit?: number;
  offset?: number;
}

/**
 * Interface for insert parameters.
 */
export interface IInsertParams {
  tableName: string;
  data: Record<string, unknown>;
}

/**
 * Interface for update parameters.
 */
export interface IUpdateParams {
  tableName: string;
  data: Record<string, unknown>;
  where: Record<string, unknown>;
  returning?: string[];
}

/**
 * Interface for delete parameters.
 */
export interface IDeleteParams {
  tableName: string;
  where: Record<string, unknown>;
}

/**
 * Interface for execute raw parameters.
 */
export interface IExecuteRawParams {
  sql: string;
  params?: unknown[];
}

/**
 * Interface for add table parameters.
 */
export interface IAddTableParams {
  tableName: string;
  schema: string;
}

/**
 * Interface for add column parameters.
 */
export interface IAddColumnParams {
  tableName: string;
  columnName: string;
  columnType: 'INTEGER' | 'TEXT' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'TIMESTAMP' | 'JSON' | 'ANY';
  nullable?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  foreignKey?: string;
}

/**
 * Interface for remove column parameters.
 */
export interface IRemoveColumnParams {
  tableName: string;
  columnName: string;
  cascadeForeignKeys?: boolean;
}

/**
 * Interface for remove table parameters.
 */
export interface IRemoveTableParams {
  tableName: string;
}

/**
 * Interface for CRUD success response.
 */
export interface ICRUDSuccessResponse {
  success: boolean;
  error?: string;
}

/**
 * Interface for select response.
 */
export interface ISelectResponse {
  success: boolean;
  rows: unknown[];
  count: number;
  truncated?: boolean;
  error?: string;
}

/**
 * Interface for insert response.
 */
export interface IInsertResponse {
  success: boolean;
  insertId: number;
  affected: number;
  error?: string;
}

/**
 * Interface for update response.
 */
export interface IUpdateResponse {
  success: boolean;
  affected: number;
  error?: string;
}

/**
 * Interface for delete response.
 */
export interface IDeleteResponse {
  success: boolean;
  affected: number;
  error?: string;
}

/**
 * Interface for execute raw response.
 */
export interface IExecuteRawResponse {
  success: boolean;
  rows: unknown[];
  rowsAffected: number;
  error?: string;
}
