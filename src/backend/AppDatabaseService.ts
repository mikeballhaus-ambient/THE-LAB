import { Database } from 'better-sqlite3';
import { ISelectParams, IInsertParams, IUpdateParams, IDeleteParams, IExecuteRawParams, IAddTableParams, IAddColumnParams, IRemoveColumnParams, IRemoveTableParams, ICRUDSuccessResponse, ISelectResponse, IInsertResponse, IUpdateResponse, IDeleteResponse, IExecuteRawResponse, IAppDatabaseConfig } from '../shared/types/app/app-database';
import { VSCodeLogger } from './utils/logger';
import { AppDatabaseManager } from './AppDatabaseManager';
import { buildConfig, validateProhibitedSQL, validateSelectLimit, validateColumnType, logAuditAction } from './utils/app-database-utils';

/**
 * AppDatabaseService private constructor.
 * @param appId - The unique app identifier.
 * @param db - The database connection.
 */
export class AppDatabaseService {
  private db: Database;
  private config: IAppDatabaseConfig;
  private appId: string;
  private schemaVersion = 1;

  /**
   * Gets a singleton instance of AppDatabaseService for the given app ID.
   * @param appId - The unique app identifier.
   * @returns The AppDatabaseService instance.
   */
  static async getInstance(appId: string): Promise<AppDatabaseService> {
    const db = await AppDatabaseManager.getInstance().getConnection(appId);
    const service = new AppDatabaseService(appId, db);
    return service;
  }

  /**
   * Closes the database connection for the specified app.
   * @param appId - The unique app identifier.
   */
  static async close(appId: string): Promise<void> {
    await AppDatabaseManager.getInstance().closeConnection(appId);
  }

  /**
   * AppDatabaseService private constructor.
   * @param appId - The unique app identifier.
   * @param db - The database connection.
   */
  private constructor(appId: string, db: Database) {
    this.appId = appId;
    this.db = db;
    this.config = this.buildConfig(appId);
  }

  /**
   * Builds the app database configuration object.
   * @param appId - The app ID.
   * @returns The app database configuration.
   */
  private buildConfig(appId: string): IAppDatabaseConfig {
    return buildConfig(appId, this.db);
  }

  /**
   * Validates raw SQL for prohibited patterns.
   * @param sql - The SQL statement to validate.
   */
  private validateProhibitedSQL(sql: string): string | undefined {
    return validateProhibitedSQL(sql);
  }

  /**
   * Validates SELECT result count.
   * @param limit - The requested limit.
   * @returns The validated limit.
   */
  private validateSelectLimit(limit: number): number {
    return validateSelectLimit(limit);
  }

  /**
   * Validates column type for addColumn operation.
   * @param columnType - The column type to validate.
   */
  private validateColumnType(columnType: string): void {
    validateColumnType(columnType);
  }

  isValid(): boolean {
    return this.db != null && this.db != undefined
  }

  getConfig(): IAppDatabaseConfig {
    return this.config
  }

  /**
   * Get raw database connection.
   */
  getDb(): Database {
    return this.db;
  }

  /**
   * Get database configuration.
   */
  getConfigPublic(): IAppDatabaseConfig {
    return this.config;
  }

  /**
   * Add Table - Creates a custom table with the specified schema.
   * @param params - Add table parameters.
   * @returns Success response.
   */
  async addTable({ tableName, schema }: IAddTableParams): Promise<ICRUDSuccessResponse> {
    const isValidTableName = await this.config.validateTableName(tableName);

    if (!isValidTableName) return { success: false, error: `Table name [${tableName}] is not valid` }
    if (!schema) return { success: false, error: `schema was not provided` }
    if (await this.config.tableExists(tableName)) return { success: false, error: `[${tableName}] already exists` };
    const sql = `CREATE TABLE ${tableName} (${schema})`
    try {
      this.db.exec(sql)
    } catch (error) {
      const errMsg = error as Error;
      return {
        success: false,
        error: `Unable to create table [${tableName}: ${errMsg.message}`
      }
    }

    return { success: true };
  }

  /**
   * Remove Table - Drops a custom table.
   * @param params - Remove table parameters.
   * @returns Success response.
   */
  async removeTable({ tableName }: IRemoveTableParams): Promise<ICRUDSuccessResponse> {
    await this.config.validateTableName(tableName);

    if (!this.config.tableExists(tableName)) {
      (await VSCodeLogger.getInstance()).warn(
        `[REMOVE_TABLE]: Table ${tableName} does not exist, skipping removal`
      );
      return { success: false, error: `[REMOVE_TABLE]: Table ${tableName} does not exist, skipping removal` };
    }

    // Check foreign keys referencing this table
    const foreignKeys = this.db.prepare(
      `PRAGMA foreign_key_list(${tableName})`
    ).all() as Array<{ table: string; from: string; to: string }>;

    if (foreignKeys.length > 0) {
      (await VSCodeLogger.getInstance()).warn(
        `[REMOVE_TABLE]: Table ${tableName} has ${foreignKeys.length} foreign key constraints`
      );
    }

    try {
      // Drop table
      this.db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    } catch (error) {
      const errMsg = error as Error;
      (await VSCodeLogger.getInstance()).error(`[REMOVE_TABLE]: Failed to remove column: ${errMsg.message}`);
      return { success: false, error: errMsg.message }
    }

    (await VSCodeLogger.getInstance()).info(`[REMOVE_TABLE]: Dropped table: ${tableName}`);
    await this.logAuditAction(this.db, 'remove_table', { tableName }, 'logs');

    return { success: true };
  }


  /**
   * Add Column - Adds a column to an existing table.
   * @param params - Add column parameters.
   * @returns Success response.
   */
  async addColumn({ tableName, columnName, columnType, nullable, default: defaultVal, primaryKey, foreignKey }: IAddColumnParams): Promise<ICRUDSuccessResponse> {
    await this.config.validateTableName(tableName);
    this.validateColumnType(columnType);

    if (await this.config.columnExists(tableName, columnName)) {
      (await VSCodeLogger.getInstance()).warn(`[ADD_COLUMN]: Column ${columnName} already exists in table ${tableName}`);
      return { success: true };
    }

    let colDef = `${columnName} ${columnType}`;

    if (nullable !== true) {
      colDef += ' NOT NULL';
    }

    if (primaryKey) {
      colDef += ' PRIMARY KEY';
    }

    if (foreignKey) {
      colDef += ` REFERENCES ${foreignKey}`;
    }

    if (defaultVal !== null && defaultVal !== undefined) {
      const defaultStr = typeof defaultVal === 'string' ? `'${defaultVal}'` : defaultVal.toString();
      colDef += ` DEFAULT ${defaultStr}`;
    }
    try {
      this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);
      (await VSCodeLogger.getInstance()).info(`[ADD_COLUMN]: Added column ${columnName} to table ${tableName}`);
    }
    catch (error) {
      const errMsg = error as Error;
      (await VSCodeLogger.getInstance()).error(`[ALTER TABLE]: Failed to remove column: ${errMsg.message}`);
      return { success: false, error: errMsg.message }
    }

    await this.logAuditAction(this.db, 'add_column', { tableName, columnName }, 'logs');

    return { success: true };
  }

  /**
   * Remove Column - Removes a column from an existing table.
   * @param params - Remove column parameters.
   * @returns Success response.
   */
  async removeColumn({ tableName, columnName, cascadeForeignKeys }: IRemoveColumnParams): Promise<ICRUDSuccessResponse> {
    await this.config.validateTableName(tableName);

    if (!this.config.columnExists(tableName, columnName)) {
      (await VSCodeLogger.getInstance()).warn(`[REMOVE_COLUMN]: Column ${columnName} does not exist in table ${tableName}`);
      return { success: true };
    }

    try {
      const tableInfo = this.db.prepare(
        'SELECT sql FROM sqlite_master WHERE type="table" AND name=?'
      ).get(tableName) as { sql: string } | undefined;

      if (!tableInfo) {
        throw new Error(`Table ${tableName} does not exist`);
      }

      const lines = tableInfo.sql.split('\n');
      const newLines = lines.filter(line => {
        const pattern = new RegExp(`^\\s*?${columnName}\\s`, 'i');
        return !pattern.test(line);
      });

      const newSchema = newLines.join('\n');
      const newTableName = `${tableName}_temp_${Date.now()}`;

      this.db.exec(newSchema.replace('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE'));
      this.db.exec(`INSERT INTO ${newTableName} SELECT * FROM ${tableName}`);
      this.db.exec(`DROP TABLE ${tableName}`);
      this.db.exec(`ALTER TABLE ${newTableName} RENAME TO ${tableName}`);

      (await VSCodeLogger.getInstance()).info(`[REMOVE_COLUMN]: Removed column ${columnName} from table ${tableName}`);
      await this.logAuditAction(this.db, 'remove_column', { tableName, columnName }, 'logs');

      if (cascadeForeignKeys) {
        const pattern = `REFERENCES ${tableName}\\\\(${columnName}\\)`;
        const referencingTables = this.db.prepare(
          `SELECT tbl_name FROM sqlite_master WHERE type='table' AND sql LIKE '${pattern}' AND tbl_name != ?`
        ).all(tableName) as { tbl_name: string }[];

        referencingTables.forEach(async (refT) => {
          (await VSCodeLogger.getInstance()).info(`[REMOVE_COLUMN]: Dropping table with foreign key dependency: ${refT.tbl_name}`);
          this.removeTable({ tableName: refT.tbl_name });
        });
      }

      return { success: true };
    } catch (error) {
      const errMsg = error as Error;
      (await VSCodeLogger.getInstance()).error(`[REMOVE_COLUMN]: Failed to remove column: ${errMsg.message}`);
      return { success: false, error: errMsg.message }
    }
  }

  /**
   * Select - Executes a SELECT query.
   * @param params - Select parameters.
   * @returns Select response.
   */
  async select({ sql, params, limit = 1000, offset = 0 }: ISelectParams): Promise<ISelectResponse> {
    const _limit = this.validateSelectLimit(limit);

    try {
      const prepared = this.db.prepare(sql);
      const cursor = params ? prepared.all(params) : prepared.all();
      const count = cursor.length;
      const rows = cursor.slice(offset, offset + _limit);

      return {
        success: true,
        rows,
        count,
        truncated: count > rows.length
      };
    } catch (error) {
      const errMsg = error as Error;
      (await VSCodeLogger.getInstance()).error(`[SELECT]: failed: ${errMsg.message}`);
      return {
        success: false,
        rows: [],
        count: 0,
        error: errMsg.message
      };
    }
  }

  /**
   * Insert - Inserts one or more rows into a table.
   * @param params - Insert parameters.
   * @returns Insert response.
   */
  async insert({ tableName, data }: IInsertParams): Promise<IInsertResponse> {
    await this.config.validateTableName(tableName);

    // Remove id if caller accidentally included it
    const filteredData = { ...data };

    delete filteredData.id;

    const keys = Object.keys(filteredData);
    const values = Object.values(filteredData);

    const placeholders = keys.map(() => '?').join(', ');
    const columnList = keys.join(', ');

    const sql = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`;

    try {
      const insertResult = this.db.prepare(sql).run(values);

      const insertId = insertResult.lastInsertRowid;
      const affected = insertResult.changes;

      (await VSCodeLogger.getInstance()).info(
        `[INSERT]: executed, inserted ${affected} row(s), id=${insertId}`
      );

      return {
        success: true,
        insertId: Number(insertId),
        affected
      };
    } catch (error) {
      const errMsg = (error as Error).message;
      (await VSCodeLogger.getInstance()).error(`[INSERT]: failed: ${errMsg}`);
      return {
        success: false,
        insertId: 0,
        affected: 0,
        error: errMsg
      };
    }
  }



  /**
   * Update - Updates rows in a table.
   * @param params - Update parameters.
   * @returns Update response.
   */
  async update({ tableName, data, where }: IUpdateParams): Promise<IUpdateResponse> {
    await this.config.validateTableName(tableName);

    const keys = Object.keys(data);
    const columnList = keys.map((key) => `${key} = ?`).join(', ');
    const whereKeys = Object.keys(where);
    const whereConditions = whereKeys.map((key) => `${key} = ?`).join(' AND ');

    const sql = `UPDATE ${tableName} SET ${columnList} WHERE ${whereConditions}`;
    const values: unknown[] = [];

    for (const key of keys) {
      values.push(data[key]);
    }
    for (const key of whereKeys) {
      values.push(where[key]);
    }

    try {
      const updateResult = this.db.prepare(sql).run(values);
      const affected = updateResult.changes;

      (await VSCodeLogger.getInstance()).info(`[UPDATE]: executed, affected ${affected} row(s)`);

      return {
        success: true,
        affected
      };
    } catch (error) {
      const errMsg = error as Error;
      (await VSCodeLogger.getInstance()).error(`[UPDATE]: failed: ${errMsg.message}`);
      return {
        success: false,
        affected: 0,
        error: errMsg.message
      };
    }
  }

  /**
   * Delete - Deletes rows from a table.
   * @param params - Delete parameters.
   * @returns Delete response.
   */
  async delete({ tableName, where }: IDeleteParams): Promise<IDeleteResponse> {
    await this.config.validateTableName(tableName);

    const whereKeys = Object.keys(where);
    const whereConditions = whereKeys.map((key) => `${key} = ?`).join(' AND ');

    const sql = `DELETE FROM ${tableName} WHERE ${whereConditions}`;
    const values: unknown[] = [];

    for (const key of whereKeys) {
      values.push(where[key]);
    }

    const invalidSql = this.validateProhibitedSQL(sql);

    if (invalidSql) {
      return {
        success: false,
        error: invalidSql,
        affected: 0
      }
    }

    try {
      const deleteResult = this.db.prepare(sql).run(values);
      const affected = deleteResult.changes;

      (await VSCodeLogger.getInstance()).info(`[DELETE]: executed, affected ${affected} row(s)`);

      return {
        success: true,
        affected
      };
    } catch (error) {
      const errMsg = error as Error;
      (await VSCodeLogger.getInstance()).error(`[DELETE]: failed: ${errMsg.message}`);
      return {
        success: false,
        affected: 0,
        error: errMsg.message
      };
    }
  }

  /**
   * Execute Raw - Executes a raw SQL statement.
   * @param params - Execute raw parameters.
   * @returns Execute raw response.
   */
  async executeRaw({ sql, params }: IExecuteRawParams): Promise<IExecuteRawResponse> {
    const invalidSql = this.validateProhibitedSQL(sql);

    if (invalidSql) {
      return {
        success: false,
        rows: [],
        error: invalidSql,
        rowsAffected: 0
      };
    }

    try {
      const trimmed = sql.trim().toLowerCase();
      const isSelect = trimmed.startsWith("select");

      let rows: Record<string, unknown>[] = [];
      let rowsAffected = 0;

      if (isSelect) {
        // SELECT → return rows
        if (params && params.length > 0) {
          rows = this.db.prepare(sql).all(params) as Record<string, unknown>[];
        } else {
          rows = this.db.prepare(sql).all() as Record<string, unknown>[];
        }
      } else {
        // INSERT / UPDATE / DELETE / DDL
        let result: { changes?: number } | undefined;
        if (params && params.length > 0) {
          result = this.db.prepare(sql).run(params);
        } else {
          this.db.exec(sql);
        }

        rowsAffected = result?.changes ?? 0;
      }

      (await VSCodeLogger.getInstance()).info(
        `[RAW_SQL]: executed, affected ${rowsAffected} row(s)`
      );

      return {
        success: true,
        rows,
        rowsAffected
      };

    } catch (error) {
      const errMsg = (error as Error).message;
      (await VSCodeLogger.getInstance()).error(`[RAW_SQL]: execution failed: ${errMsg}`);

      return {
        success: false,
        rows: [],
        rowsAffected: 0,
        error: errMsg
      };
    }
  }

  async logAuditAction(
    db: Database,
    action: string,
    details: Record<string, unknown>,
    tableName?: string
  ): Promise<void> {
    logAuditAction(db, action, details, tableName)
  }
}
