import type { Database } from 'better-sqlite3';
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
  IExecuteRawResponse,
} from '@/shared/types/app/app-database';

export class AppDatabaseServiceProxy {
  private static instance: AppDatabaseServiceProxy | null = null;
  private baseServiceInstance!: AppDatabaseService;

  private constructor() {}

  public static getInstance(): AppDatabaseServiceProxy {
    if (!this.instance) {
      this.instance = new AppDatabaseServiceProxy();
    }
    return this.instance;
  }

  public async initialize(): Promise<void> {
    this.baseServiceInstance = await AppDatabaseService.getInstance('blackjack');
  }

  public getDb(): Database {
    return this.baseServiceInstance.getDb();
  }

  public async addTable({ tableName, schema }: IAddTableParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.addTable({ tableName, schema })) as ICRUDSuccessResponse;
  }

  public async removeTable({ tableName }: IRemoveTableParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.removeTable({ tableName })) as ICRUDSuccessResponse;
  }

  public async addColumn(params: IAddColumnParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.addColumn(params)) as ICRUDSuccessResponse;
  }

  public async removeColumn(params: IRemoveColumnParams): Promise<ICRUDSuccessResponse> {
    return (await this.baseServiceInstance.removeColumn(params)) as ICRUDSuccessResponse;
  }

  public async select(params: ISelectParams): Promise<ISelectResponse> {
    return (await this.baseServiceInstance.select(params)) as ISelectResponse;
  }

  public async insert(params: IInsertParams): Promise<IInsertResponse> {
    return (await this.baseServiceInstance.insert(params)) as IInsertResponse;
  }

  public async update(params: IUpdateParams): Promise<IUpdateResponse> {
    return (await this.baseServiceInstance.update(params)) as IUpdateResponse;
  }

  public async delete(params: IDeleteParams): Promise<IDeleteResponse> {
    return (await this.baseServiceInstance.delete(params)) as IDeleteResponse;
  }

  public async executeRaw(params: IExecuteRawParams): Promise<IExecuteRawResponse> {
    return (await this.baseServiceInstance.executeRaw(params)) as IExecuteRawResponse;
  }
}
