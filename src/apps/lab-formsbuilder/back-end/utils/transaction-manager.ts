/**
 * Transaction Manager - Provides database transaction utilities for SQLite
 */

import type { Database } from 'better-sqlite3';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';

export interface TransactionOptions {
  timeout?: number;
}

export class TransactionManager {
  private static instance: TransactionManager;
  private dbProxy: AppDatabaseServiceProxy;
  private db: Database;

  private constructor() {
    this.dbProxy = AppDatabaseServiceProxy.getInstance();
    this.db = this.dbProxy.getDb();
  }

  public static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Begin a database transaction.
   */
  async beginTransaction(): Promise<void> {
    await this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit the current transaction.
   */
  async commitTransaction(): Promise<void> {
    await this.db.exec('COMMIT');
  }

  /**
   * Rollback the current transaction.
   */
  async rollbackTransaction(): Promise<void> {
    await this.db.exec('ROLLBACK');
  }

  /**
   * Execute multiple SQL statements within a transaction.
   */
  async executeInTransaction<T>(statements: string[], params?: unknown[]): Promise<T | void> {
    try {
      await this.beginTransaction();

      for (const statement of statements) {
        if (params && Array.isArray(statement)) {
          const [sql, ...parameters] = statement;
          const prepared = this.db.prepare(sql);
          for (const param of parameters) {
            prepared.run(...param);
          }
        } else {
          const prepared = this.db.prepare(statement);
          prepared.run();
        }
      }

      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Execute a single SQL statement within a transaction.
   */
  async executeInTransactionSingle<T>(sql: string, params?: unknown[]): Promise<T | void> {
    try {
      await this.beginTransaction();

      const prepared = this.db.prepare(sql);
      if (params && params.length > 0) {
        return prepared.run(...params) as T;
      }
      return prepared.run() as T;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }
}
