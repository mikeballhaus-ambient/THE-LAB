import { Database } from 'better-sqlite3';
import * as path from 'path';
import { VSCodeLogger } from './logger';
import { MAX_SELECT_ROWS, RESERVED_TABLES, IAppDatabaseConfig } from './../../shared/types/app/app-database';
import { STANDARD_TABLE_NAMES } from './../AppDatabaseManager';

/**
 * Builds the app database configuration object.
 *
 * @param appId - The unique app identifier.
 * @param db - The database connection.
 * @returns The app database configuration.
 */
export function buildConfig(appId: string, db: Database): IAppDatabaseConfig {
  const appName = appId.replace(/[^a-z0-9]+/g, '-').toLowerCase();
  const migrationTableName = `${appName}_migrations`;
  const appDirectory = path.join(process.cwd(), 'src', 'apps', appName);
  const dbLocation = path.join(appDirectory, 'db', 'the_lab.db');

  return {
    appName,
    appId,
    dbLocation,
    migrationTable: migrationTableName,
    standardTables: STANDARD_TABLE_NAMES,

    items: 'items',
    users: 'users',
    configs: 'configs',
    logs: 'logs',

    _getAppName: () => appName,
    _getAppId: () => appId,
    _getMigrationTable: () => migrationTableName,
    _getDb: () => db,

    tableExists: async (tableName: string): Promise<boolean> => {
      try {
        const exists = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(tableName) as { name: string } | undefined;
        return !!exists;
      } catch (error: unknown) {
        (await VSCodeLogger.getInstance()).error(`Failed to check if table exists: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    },

    columnExists: async (tableName: string, columnName: string): Promise<boolean> => {
      try {
        const schema = db.prepare(
          `SELECT sql FROM sqlite_master WHERE type="table" AND name=?`
        ).get(tableName) as { sql: string } | undefined;

        if (!schema) return false;

        const columnRegex = new RegExp(`\\b${columnName}\\s+(?:INTEGER|TEXT|REAL|BLOB|BOOLEAN|TIMESTAMP|JSON|ANY|VARCHAR|NUMERIC|DATETIME)`, 'i');
        return columnRegex.test(schema.sql);
      } catch (error: unknown) {
        (await VSCodeLogger.getInstance()).error(`Failed to check if column exists: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    },

    getIndexInfo: async (tableName: string): Promise<Record<string, string[]>> => {
      try {
        const indexes = db.prepare(
          `SELECT name, tbl_name FROM sqlite_master WHERE type="index" AND tbl_name=?`
        ).all(tableName) as { name: string; tbl_name: string }[];

        const result = indexes.reduce((acc: Record<string, string[]>, index: { name: string; tbl_name: string }) => {
          acc[index.name] = [index.tbl_name];
          return acc;
        }, {});
        return result;
      } catch (error: unknown) {
        (await VSCodeLogger.getInstance()).error(`Failed to get index info: ${error instanceof Error ? error.message : String(error)}`);
        return {};
      }
    },

    validateTableName: async (tableName: string): Promise<boolean> => {
      const normalized = tableName.toLowerCase().trim();
      return !RESERVED_TABLES.includes(normalized) && tableName.trim().length > 0;
    },

    migrationTableExists: async (): Promise<boolean> => {
      try {
        const exists = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(migrationTableName) as { name: string } | undefined;
        return !!exists;
      } catch (error: unknown) {
        (await VSCodeLogger.getInstance()).error(`Failed to check if migration table exists: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }
    }
  };
}

/**
 * Validates raw SQL for prohibited patterns.
 * 
 * @param sql - The SQL statement to validate.
 * @returns Error message if prohibited, undefined otherwise.
 */
export function validateProhibitedSQL(sql: string): string | undefined {
  const sqlUpper = sql.toUpperCase().trim();

  if (sqlUpper.startsWith('DELETE ') && !sqlUpper.includes('WHERE ')) {
    return 'Prohibited: DELETE without WHERE clause';
  }

  if (/^(ATTACH|DETACH)\s+DATABASE/i.test(sqlUpper)) {
    return 'Prohibited: ATTACH/DETACH DATABASE commands';
  }

  if (sqlUpper.startsWith('PRAGMA ')) {
    return 'Prohibited: PRAGMA modifications not allowed';
  }

  return undefined;
}

/**
 * Validates SELECT result count.
 * 
 * @param limit - The requested limit.
 * @returns The validated limit.
 */
export function validateSelectLimit(limit: number): number {
  if (limit > MAX_SELECT_ROWS) {
    throw new Error(`SELECT result limit exceeded: max ${MAX_SELECT_ROWS} rows`);
  }
  return limit;
}

/**
 * Validates column type for addColumn operation.
 * 
 * @param columnType - The column type to validate.
 * @throws Error if unsupported column type.
 */
export function validateColumnType(columnType: string): void {
  const supportedTypes = ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'BOOLEAN', 'TIMESTAMP', 'JSON', 'ANY'];
  const normalized = columnType.toUpperCase();

  if (!supportedTypes.includes(normalized)) {
    throw new Error(`Unsupported column type: ${columnType}. Supported types: ${supportedTypes.join(', ')}`);
  }
}

/**
 * Logs an audit action to the database.
 * 
 * @param db - The database connection.
 * @param action - The action being logged.
 * @param details - Additional details about the action.
 * @param tableName - Optional table name for context.
 * @returns Promise that resolves when the log is written.
 */
export async function logAuditAction(
  db: Database,
  action: string,
  details: Record<string, unknown>,
  tableName?: string
): Promise<void> {
  const logger = await VSCodeLogger.getInstance();

  try {
    if (!tableName || !(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName) as { name: string } | undefined)) {
      return;
    }

    db.prepare(`
            INSERT INTO logs (action, details, severity)
            VALUES (?, ?, ?)
        `).run(
      action,
      JSON.stringify(details),
      'INFO'
    );

    const actionDetails: Record<string, unknown> = { action, details };
    if (tableName) {
      actionDetails.tableName = tableName;
    }
    logger.json(`[AUDIT]: ${action}`, actionDetails);
  } catch (error) {
    logger.error(`Failed to log audit action "${action}": ${error}`);
  }
}
