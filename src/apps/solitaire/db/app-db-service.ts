// Per-app database proxy for the Solitaire app (folder slug: solitaire).
import type { Database } from 'better-sqlite3';
import { AppDatabaseService } from '@/backend/AppDatabaseService';
import type {
  IAddColumnParams,
  IAddTableParams,
  ICRUDSuccessResponse,
  IDeleteParams,
  IDeleteResponse,
  IExecuteRawParams,
  IExecuteRawResponse,
  IInsertParams,
  IInsertResponse,
  IRemoveColumnParams,
  IRemoveTableParams,
  ISelectParams,
  ISelectResponse,
  IUpdateParams,
  IUpdateResponse,
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
    this.baseServiceInstance = await AppDatabaseService.getInstance('solitaire');
  }

  public getDb(): Database {
    return this.baseServiceInstance.getDb();
  }

  public async addTable(params: IAddTableParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.addTable(params) as ICRUDSuccessResponse;
  }

  public async removeTable(params: IRemoveTableParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.removeTable(params) as ICRUDSuccessResponse;
  }

  public async addColumn(params: IAddColumnParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.addColumn(params) as ICRUDSuccessResponse;
  }

  public async removeColumn(params: IRemoveColumnParams): Promise<ICRUDSuccessResponse> {
    return await this.baseServiceInstance.removeColumn(params) as ICRUDSuccessResponse;
  }

  public async select(params: ISelectParams): Promise<ISelectResponse> {
    return await this.baseServiceInstance.select(params) as ISelectResponse;
  }

  public async insert(params: IInsertParams): Promise<IInsertResponse> {
    return await this.baseServiceInstance.insert(params) as IInsertResponse;
  }

  public async update(params: IUpdateParams): Promise<IUpdateResponse> {
    return await this.baseServiceInstance.update(params) as IUpdateResponse;
  }

  public async delete(params: IDeleteParams): Promise<IDeleteResponse> {
    return await this.baseServiceInstance.delete(params) as IDeleteResponse;
  }

  public async executeRaw(params: IExecuteRawParams): Promise<IExecuteRawResponse> {
    return await this.baseServiceInstance.executeRaw(params) as IExecuteRawResponse;
  }
}
