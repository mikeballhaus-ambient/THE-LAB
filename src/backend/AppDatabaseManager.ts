import betterSqlite3, { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { VSCodeLogger } from './utils/logger';

/**
 * Standard table names (reserved) defined in templates
 */
export const STANDARD_TABLE_NAMES = ['items', 'users', 'configs', 'logs'] as const;

/**
 * Schema template directory path
 */
const SCHEMA_TEMPLATE_DIR = path.join(process.cwd(), 'src', 'shared', 'templates', 'db', 'schemas');

/**
 * Loads SQL schema dynamically from template SQL files.
 * @param tableName - The name of the table to load the schema for.
 * @returns The SQL schema string for the table, or null if not found.
 */
async function loadTableSchema(tableName: string): Promise<string | null> {
  const schemaPath = path.join(SCHEMA_TEMPLATE_DIR, `${tableName}.sql`);

  try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    return schema;
  } catch {
    // Schema file not found - fall back to dynamic table creation
    return null;
  }
}

/**
 * Singleton class that manages per-app SQLite database connections using an internal Map.
 * Ensures exactly one global instance with one connection per app ID.
 */
export class AppDatabaseManager {
  private static instance: AppDatabaseManager;
  private connections: Map<string, Database> = new Map<string, Database>();

  // Private constructor prevents direct instantiation
  private constructor() {

  }

  // Static singleton accessor
  static getInstance(): AppDatabaseManager {
    if (!AppDatabaseManager.instance) {
      AppDatabaseManager.instance = new AppDatabaseManager();
    }
    return AppDatabaseManager.instance;
  }

  /**
   * Get connection for app (creates if not exists)
   * Enabling foreign key constraints per requirement B-10
   */
  async getConnection(id: string): Promise<Database> {
    if (!this.connections.has(id)) {
      try {
        if (!this.connections.has(id)) {
          const db = await this.initializeDatabase(id)
          this.connections.set(id, db);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create database connection for app ${id}: ${message}`);
      }
    }
    return this.connections.get(id)!;
  }

  /**
   * Initialize Database - Creates database file and standard tables.
   * @param params - Database initialization parameters.
   * @returns Success response.
   */
  async initializeDatabase(id: string): Promise<Database> {
    const normalizedId = id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const appPath = path.join(process.cwd(), 'src', 'apps', normalizedId, 'db');
    const dbPath = path.join(appPath, 'the_lab.db')
    fs.mkdirSync(appPath, { recursive: true });
    const db = betterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = FULL');
    db.pragma('busy_timeout = 10000');

    try {
      // Load migration table schema dynamically from schema files
      const migrationSchema = await loadTableSchema('migration');
      if (migrationSchema) {
        db.exec(migrationSchema);
        (await VSCodeLogger.getInstance()).info(`[INIT]: Created migration table from schema: ${normalizedId}_migrations`);
      }

      // Create standard tables (items, users, configs, logs) from dynamic schema loader
      for (const tableName of STANDARD_TABLE_NAMES) {
        const schema = await loadTableSchema(tableName);
        if (schema) {
          db.exec(schema);
          (await VSCodeLogger.getInstance()).info(`[INIT]: Created standard table: ${tableName}`);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`initializeDB error: ${message}`);
      (await VSCodeLogger.getInstance()).error(`[INIT]: Failed to initialize database: ${message}`);
      throw error;
    }

    return db;
  }

  /**
   * Close connection for specific app
   */
  async closeConnection(appId: string): Promise<void> {
    try {
      const connection = this.connections.get(appId);
      if (connection) {
        try {
          connection.close();
        } catch {
          // Ignore connection close errors - connection may already be closed
        }

        this.connections.delete(appId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Silently continue - do not throw to allow app deletion
      console.error(`Failed to close connection for app ${appId}: ${message}`);
    }
  }

  /**
   * Shutdown all connections and clean up directories
   */
  async shutdown(): Promise<void> {
    console.info('Shutting down all database connections');
    for (const [id, connection] of this.connections.entries()) {
      try {
        connection.close();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to close connection during shutdown for app ${id}:: ${message}`);
      }
    }
    this.connections.clear();
  }

  /**
   * Check if connection exists for app
   */
  hasConnection(id: string): boolean {
    return this.connections.has(id);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Export singleton instance for global access
export const databaseManager = AppDatabaseManager.getInstance();
