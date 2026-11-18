import type { Database } from 'better-sqlite3';
// Template: src/templates/app-db-service.ts.template
// This file will be generated for each new app at: src/apps/{appName}/db/my-db-service.ts

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

/**
 * This class provides a simplified interface for database operations.
 */
export class AppDatabaseServiceProxy {
  private static instance: AppDatabaseServiceProxy | null = null;
  private baseServiceInstance!: AppDatabaseService;

  private constructor() { }

  public static getInstance(): AppDatabaseServiceProxy {
    if (!this.instance) {
      this.instance = new AppDatabaseServiceProxy();
    }
    return this.instance;
  }

  public async initialize(): Promise<void> {
    this.baseServiceInstance = await AppDatabaseService.getInstance('home-maintenance');
  }

  /** Raw better-sqlite3 handle — required by the app's server routes. */
  public getDb(): Database {
    return this.baseServiceInstance.getDb();
  }

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
}
